import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { scorePrediction } from "./scoring";
import { sendPushToAll } from "./push";
import { propagateAdvancement } from "./advancement";
import { isKnockoutStage } from "./stageLabel";

const TOKEN = process.env.FOOTBALL_DATA_TOKEN;
const BASE = "https://api.football-data.org/v4";

type FdScorePair = { home: number | null; away: number | null };
type FdMatch = {
  id: number;
  utcDate: string;
  status: string;
  matchday?: number;
  stage: string;
  group?: string;
  homeTeam: { id: number };
  awayTeam: { id: number };
  score?: {
    winner?: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    duration?: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT";
    fullTime?: FdScorePair;    // UWAGA: przy karnych ZAWIERA bramki z karnych!
    regularTime?: FdScorePair; // wynik po 90 min (tylko knockout z dogrywką)
    extraTime?: FdScorePair;   // bramki TYLKO z okresu dogrywki (nie kumulatywne)
    penalties?: FdScorePair;   // wynik konkursu rzutów karnych
  };
};

/**
 * Parsuje score z football-data.org v4 na naszą strukturę.
 *
 * BŁĄD który to naprawia: FD przy meczach rozstrzygniętych karnymi zwraca
 * w `fullTime` wynik ŁĄCZNIE z bramkami z karnych (np. 1:1 + karne 3:4 -> fullTime 4:5).
 * `extraTime` to z kolei bramki wyłącznie z okresu 91-120 min (zwykle 0:0),
 * NIE stan meczu po dogrywce. Poprawny wynik "z gry" = regularTime + extraTime.
 *
 * Zwraca: wynik z gry (regulamin+dogrywka) i karne osobno.
 */
export function parseFdScore(score: FdMatch["score"]):
  | { home: number; away: number; homeSO: number | null; awaySO: number | null }
  | null {
  const ft = score?.fullTime;
  if (ft?.home == null || ft?.away == null) return null;

  const pens = score?.penalties;
  const hasPens = pens?.home != null && pens?.away != null;
  if (!hasPens) {
    // Bez karnych fullTime jest wiarygodny (zawiera dogrywkę jeśli była)
    return { home: ft.home, away: ft.away, homeSO: null, awaySO: null };
  }

  // Karne: odtwórz wynik z gry z okresów
  const rt = score?.regularTime;
  const et = score?.extraTime;
  if (rt?.home != null && rt?.away != null) {
    return {
      home: rt.home + (et?.home ?? 0),
      away: rt.away + (et?.away ?? 0),
      homeSO: pens.home,
      awaySO: pens.away,
    };
  }
  // Fallback gdy brak regularTime: odejmij karne od fullTime
  return {
    home: ft.home - pens.home!,
    away: ft.away - pens.away!,
    homeSO: pens.home,
    awaySO: pens.away,
  };
}

async function fdFetch<T>(path: string): Promise<T | null> {
  if (!TOKEN) return null;
  const r = await fetch(`${BASE}${path}`, { headers: { "X-Auth-Token": TOKEN } });
  if (!r.ok) return null;
  return r.json() as Promise<T>;
}

export type SyncResult = {
  ok: boolean;
  updated: number;
  scoredPredictions: number;
  push?: { sent: number; removed: number };
  error?: string;
};

/**
 * Pobiera zakończone mecze z football-data.org, aktualizuje wyniki w bazie
 * i przelicza punkty. Może być wywoływane przez cron lub ręcznie z panelu admina.
 *
 * @param opts.sendPush - czy wysłać powiadomienie push (domyślnie tylko z crona)
 */
export async function syncFinishedResults(opts: { sendPush?: boolean } = {}): Promise<SyncResult> {
  const data = await fdFetch<{ matches: FdMatch[] }>("/competitions/WC/matches?season=2026&status=FINISHED");
  if (!data) return { ok: false, updated: 0, scoredPredictions: 0, error: "fetch_failed" };

  let updated = 0;
  let scoredPredictions = 0;

  for (const m of data.matches) {
    // Poprawny parse: wynik z gry (regulamin+dogrywka) + karne osobno.
    // Poprzednio `extraTime ?? fullTime` dawało 0:0 dla meczy z karnymi
    // (extraTime = bramki tylko z okresu dogrywki), a jeszcze wcześniej
    // surowy fullTime dawał wynik z wliczonymi karnymi (4:5).
    const parsed = parseFdScore(m.score);
    if (!parsed) continue;
    const { home, away, homeSO, awaySO } = parsed;

    const existing = await prisma.match.findUnique({ where: { id: `fd-${m.id}` } });
    if (!existing) continue;
    if (
      existing.homeScore === home &&
      existing.awayScore === away &&
      existing.homeShootoutScore === homeSO &&
      existing.awayShootoutScore === awaySO
    ) continue;

    await prisma.match.update({
      where: { id: existing.id },
      data: { homeScore: home, awayScore: away, homeShootoutScore: homeSO, awayShootoutScore: awaySO },
    });
    updated++;

    // Propagacja awansu dla knockout - ta sama logika co ręczny zapis w adminie
    // (exclusive placement, więc naprawia też ewentualne wcześniejsze duplikaty)
    if (isKnockoutStage(existing.stage)) {
      try {
        await propagateAdvancement(existing.id, home, away, homeSO, awaySO);
      } catch {
        // propagacja nie może wywalić syncu wyników
      }
    }

    const preds = await prisma.prediction.findMany({ where: { matchId: existing.id } });
    for (const p of preds) {
      const pts = scorePrediction(
        {
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          firstScorerTeam: (p.firstScorerTeam as any) ?? null,
          firstGoalPlayerId: p.firstGoalPlayerId,
        },
        {
          homeScore: home,
          awayScore: away,
          firstScorerTeam:
            existing.firstScorerTeamId === existing.homeTeamId ? "HOME"
            : existing.firstScorerTeamId === existing.awayTeamId ? "AWAY"
            : "NONE",
          firstGoalPlayerId: existing.firstGoalPlayerId,
        }
      );
      await prisma.prediction.update({ where: { id: p.id }, data: { pointsAwarded: pts } });
      scoredPredictions++;
    }
  }

  let pushResult: { sent: number; removed: number } | undefined;
  if (opts.sendPush) {
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endOfDay = new Date(startOfDay.getTime() + 24 * 3600 * 1000);
    const todayCount = await prisma.match.count({
      where: { kickoff: { gte: startOfDay, lt: endOfDay } },
    });
    if (updated > 0 || todayCount > 0) {
      const parts: string[] = [];
      if (updated > 0) parts.push(`⚽ Wczoraj rozegrane: ${updated}, punkty przeliczone`);
      if (todayCount > 0) parts.push(`📅 Dziś ${todayCount} ${todayCount === 1 ? "mecz" : "meczy"} - typuj!`);
      pushResult = await sendPushToAll({
        title: "WC Predictor 2026",
        body: parts.join(" · "),
        url: "/dashboard",
      });
    }
  }

  // Po sync wszystkie cache'owane strony invalidate
  if (updated > 0) {
    revalidatePath("/leaderboard");
    revalidatePath("/groups");
    revalidatePath("/bracket");
    revalidatePath("/stats");
    revalidatePath("/dashboard");
    revalidatePath("/my-predictions");
  }

  return { ok: true, updated, scoredPredictions, push: pushResult };
}

/**
 * Sync TYLKO terminarza - aktualizuje daty meczy + podlinkowuje awansujące drużyny
 * (gdy football-data przypisze prawdziwe zespoły do meczy 1/16 / 1/8 itd.).
 * Nie rusza wyników/punktów. Idealne do cron raz dziennie.
 */
export async function syncSchedule(): Promise<{ ok: boolean; touched: number; linkedRealTeams: number; error?: string }> {
  const data = await fdFetch<{ matches: any[] }>("/competitions/WC/matches?season=2026");
  if (!data) return { ok: false, touched: 0, linkedRealTeams: 0, error: "fetch_failed" };

  const tbd = await prisma.team.upsert({
    where: { shortCode: "TBD" },
    update: {},
    create: { name: "TBD", shortCode: "TBD", flag: "🏳️" },
  });

  let touched = 0;
  let linkedRealTeams = 0;
  let teamsLinkedNow = false;

  for (const m of data.matches) {
    try {
      const home = m.homeTeam?.id ? await prisma.team.findUnique({ where: { apiId: m.homeTeam.id } }) : null;
      const away = m.awayTeam?.id ? await prisma.team.findUnique({ where: { apiId: m.awayTeam.id } }) : null;
      const homeId = home?.id ?? tbd.id;
      const awayId = away?.id ?? tbd.id;

      const existing = await prisma.match.findUnique({
        where: { id: `fd-${m.id}` },
        select: { homeTeamId: true, awayTeamId: true, kickoff: true },
      });

      if (!existing) {
        const stage = m.group
          ? `Grupa ${m.group.replace("GROUP_", "")}`
          : translateStage(m.stage);
        // Faza grupowa = matchday z API (1-3). Knockout = wymuszone od stage (100+).
        const matchday = m.stage === "GROUP_STAGE" ? (m.matchday ?? 1) : stageOrderLocal(m.stage);
        await prisma.match.create({
          data: {
            id: `fd-${m.id}`,
            matchday,
            stage,
            kickoff: new Date(m.utcDate),
            homeTeamId: homeId,
            awayTeamId: awayId,
          },
        });
        touched++;
        continue;
      }

      const wasReal = existing.homeTeamId !== tbd.id && existing.awayTeamId !== tbd.id;
      const nowReal = homeId !== tbd.id && awayId !== tbd.id;
      const kickoffChanged = existing.kickoff.getTime() !== new Date(m.utcDate).getTime();

      // NIGDY nie nadpisuj real team na TBD - tylko upgrade TBD->real.
      // Dzięki temu nasza manualna propagacja awansu z admina przeżywa cron sync.
      // Gdy FD ma już prawdziwą drużynę - nadpisze (FD jest source of truth dla par).
      const finalHomeId = homeId !== tbd.id ? homeId : existing.homeTeamId;
      const finalAwayId = awayId !== tbd.id ? awayId : existing.awayTeamId;
      const teamsChanged = existing.homeTeamId !== finalHomeId || existing.awayTeamId !== finalAwayId;

      const correctStage = m.group
        ? `Grupa ${m.group.replace("GROUP_", "")}`
        : translateStage(m.stage);
      const correctMatchday = m.stage === "GROUP_STAGE" ? (m.matchday ?? 1) : stageOrderLocal(m.stage);

      if (kickoffChanged || teamsChanged || true /* zawsze sprawdź stage/matchday */) {
        await prisma.match.update({
          where: { id: `fd-${m.id}` },
          data: {
            kickoff: new Date(m.utcDate),
            homeTeamId: finalHomeId,
            awayTeamId: finalAwayId,
            stage: correctStage,
            matchday: correctMatchday,
          },
        });
        touched++;
        if (!wasReal && nowReal) {
          linkedRealTeams++;
          teamsLinkedNow = true;
        }
      }
    } catch {
      // ignore single match errors
    }
  }

  if (touched > 0) {
    revalidatePath("/dashboard");
    revalidatePath("/bracket");
    revalidatePath("/groups");
  }
  if (teamsLinkedNow) {
    revalidatePath("/champion"); // bo lockAt może się zmienić
  }

  return { ok: true, touched, linkedRealTeams };
}

function translateStage(stage: string): string {
  switch (stage) {
    case "GROUP_STAGE": return "Faza grupowa";
    case "LAST_32": return "1/16 finału";
    case "LAST_16": return "1/8 finału";
    case "QUARTER_FINALS": return "Ćwierćfinał";
    case "SEMI_FINALS": return "Półfinał";
    case "THIRD_PLACE": return "Mecz o 3. miejsce";
    case "FINAL": return "Finał";
    default: return stage;
  }
}
function stageOrderLocal(stage: string): number {
  switch (stage) {
    case "LAST_32": return 100;
    case "LAST_16": return 101;
    case "QUARTER_FINALS": return 102;
    case "SEMI_FINALS": return 103;
    case "THIRD_PLACE": return 104;
    case "FINAL": return 105;
    default: return 1;
  }
}
