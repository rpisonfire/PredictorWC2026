import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scorePrediction } from "@/lib/scoring";

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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET;
  const isVercelCron = auth === `Bearer ${secret}` || req.headers.get("x-vercel-cron") === "1";
  const isManual = url.searchParams.get("key") === secret;
  if (secret && !isVercelCron && !isManual) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const data = await fdFetch<{ matches: FdMatch[] }>("/competitions/WC/matches?season=2026&status=FINISHED");
  if (!data) return NextResponse.json({ error: "fetch_failed" }, { status: 502 });

  let updated = 0;
  let scoredPredictions = 0;

  for (const m of data.matches) {
    const home = m.score?.fullTime?.home;
    const away = m.score?.fullTime?.away;
    if (home == null || away == null) continue;

    const existing = await prisma.match.findUnique({ where: { id: `fd-${m.id}` } });
    if (!existing) continue;
    // Skip if already finalized with same score
    if (existing.homeScore === home && existing.awayScore === away) continue;

    await prisma.match.update({
      where: { id: existing.id },
      data: { homeScore: home, awayScore: away },
    });
    updated++;

    // Recalc points for all predictions on this match
    // Note: firstScorerTeam / firstGoalPlayer not provided by football-data.org free tier — admin must set manually
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

  return NextResponse.json({ ok: true, updated, scoredPredictions, ts: new Date().toISOString() });
}
