import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { scorePrediction } from "./scoring";
import { sendPushToAll } from "./push";

const TOKEN = process.env.FOOTBALL_DATA_TOKEN;
const BASE = "https://api.football-data.org/v4";

type FdMatch = {
  id: number;
  utcDate: string;
  status: string;
  matchday?: number;
  stage: string;
  group?: string;
  homeTeam: { id: number };
  awayTeam: { id: number };
  score?: { fullTime?: { home: number | null; away: number | null } };
};

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
    const home = m.score?.fullTime?.home;
    const away = m.score?.fullTime?.away;
    if (home == null || away == null) continue;

    const existing = await prisma.match.findUnique({ where: { id: `fd-${m.id}` } });
    if (!existing) continue;
    if (existing.homeScore === home && existing.awayScore === away) continue;

    await prisma.match.update({
      where: { id: existing.id },
      data: { homeScore: home, awayScore: away },
    });
    updated++;

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
        await prisma.match.create({
          data: {
            id: `fd-${m.id}`,
            matchday: m.matchday ?? stageOrderLocal(m.stage),
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
      const teamsChanged = existing.homeTeamId !== homeId || existing.awayTeamId !== awayId;

      if (kickoffChanged || teamsChanged) {
        await prisma.match.update({
          where: { id: `fd-${m.id}` },
          data: {
            kickoff: new Date(m.utcDate),
            homeTeamId: homeId,
            awayTeamId: awayId,
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
    case "LAST_16": return "1/16 finału";
    case "QUARTER_FINALS": return "Ćwierćfinał";
    case "SEMI_FINALS": return "Półfinał";
    case "THIRD_PLACE": return "Mecz o 3. miejsce";
    case "FINAL": return "Finał";
    case "ROUND_OF_16": return "1/8 finału";
    default: return stage;
  }
}
function stageOrderLocal(stage: string): number {
  switch (stage) {
    case "LAST_16": return 100;
    case "ROUND_OF_16": return 101;
    case "QUARTER_FINALS": return 102;
    case "SEMI_FINALS": return 103;
    case "THIRD_PLACE": return 104;
    case "FINAL": return 105;
    default: return 1;
  }
}
