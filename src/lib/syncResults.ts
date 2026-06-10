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
          firstScorerTeam: (existing.firstScorerTeamId as any) ?? "NONE",
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

  return { ok: true, updated, scoredPredictions, push: pushResult };
}
