import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scorePrediction } from "@/lib/scoring";
import { sendPushToAll } from "@/lib/push";

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
    // Note: firstScorerTeam / firstGoalPlayer not provided by football-data.org free tier - admin must set manually
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

  // Codzienne powiadomienie push: ile meczów dziś + przypomnienie o boostach
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endOfDay = new Date(startOfDay.getTime() + 24 * 3600 * 1000);
  const todayCount = await prisma.match.count({
    where: { kickoff: { gte: startOfDay, lt: endOfDay } },
  });
  let pushResult = { sent: 0, removed: 0 };
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

  return NextResponse.json({ ok: true, updated, scoredPredictions, push: pushResult, ts: new Date().toISOString() });
}
