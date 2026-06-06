import { prisma } from "./db";

export type UserStats = {
  totalPoints: number;
  predictionCount: number;
  finishedCount: number;
  exactScoreHits: number;
  scorerHits: number;
  avgPointsPerMatch: number;
  accuracy: number; // % of finished predictions that scored any points
  longestStreak: number; // consecutive finished matches with points > 0
  successfulBoosts: number;
};

export type Badge = {
  key: string;
  emoji: string;
  label: string;
  description: string;
};

export function badgesFor(stats: UserStats): Badge[] {
  const out: Badge[] = [];
  if (stats.exactScoreHits >= 3)
    out.push({ key: "snajper", emoji: "🎯", label: "Snajper", description: "3+ dokładne wyniki" });
  if (stats.scorerHits >= 5)
    out.push({ key: "krol-strzelcow", emoji: "👑", label: "Król strzelców", description: "5+ trafionych strzelców" });
  if (stats.successfulBoosts >= 3)
    out.push({ key: "mistrz-boosta", emoji: "⚡", label: "Mistrz boosta", description: "3+ udane boosty" });
  if (stats.longestStreak >= 3)
    out.push({ key: "trzy-z-rzedu", emoji: "🔥", label: "Trzy z rzędu", description: "3+ punktowane mecze pod rząd" });
  return out;
}

export const CHAMPION_BONUS = 10;

export async function championBonusForUser(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberships: { include: { league: true } } },
  });
  if (!user?.predictedChampionId) return 0;
  const wonLeague = user.memberships.find(
    (m) => m.league.actualChampionId && m.league.actualChampionId === user.predictedChampionId
  );
  return wonLeague ? CHAMPION_BONUS : 0;
}

export async function statsForUser(userId: string): Promise<UserStats> {
  const predictions = await prisma.prediction.findMany({
    where: { userId },
    include: { match: true },
    orderBy: { match: { kickoff: "asc" } },
  });
  const boosts = await prisma.boost.findMany({ where: { userId } });
  const boostMatchIds = new Set(boosts.map((b) => b.matchId));

  const finished = predictions.filter((p) => p.match.homeScore !== null);

  let totalPoints = await championBonusForUser(userId);
  let exactScoreHits = 0;
  let scorerHits = 0;
  let pointed = 0;
  let successfulBoosts = 0;
  let longestStreak = 0;
  let currentStreak = 0;

  for (const p of finished) {
    const boosted = boostMatchIds.has(p.matchId);
    const pts = boosted ? p.pointsAwarded * 3 : p.pointsAwarded;
    totalPoints += pts;
    if (p.homeScore === p.match.homeScore && p.awayScore === p.match.awayScore) exactScoreHits++;
    if (p.firstGoalPlayerId && p.firstGoalPlayerId === p.match.firstGoalPlayerId) scorerHits++;
    if (p.pointsAwarded > 0) {
      pointed++;
      currentStreak++;
      if (currentStreak > longestStreak) longestStreak = currentStreak;
      if (boosted) successfulBoosts++;
    } else {
      currentStreak = 0;
    }
  }

  const finishedCount = finished.length;
  return {
    totalPoints,
    predictionCount: predictions.length,
    finishedCount,
    exactScoreHits,
    scorerHits,
    avgPointsPerMatch: finishedCount ? totalPoints / finishedCount : 0,
    accuracy: finishedCount ? (pointed / finishedCount) * 100 : 0,
    longestStreak,
    successfulBoosts,
  };
}

export async function leaderboard(): Promise<{
  userId: string;
  nickname: string;
  avatar: string;
  stats: UserStats;
  badges: Badge[];
}[]> {
  const users = await prisma.user.findMany();
  const rows = await Promise.all(
    users.map(async (u) => {
      const stats = await statsForUser(u.id);
      return { userId: u.id, nickname: u.nickname, avatar: u.avatar, stats, badges: badgesFor(stats) };
    })
  );
  return rows.sort((a, b) => b.stats.totalPoints - a.stats.totalPoints);
}

export async function leaderboardForMatchday(matchday: number) {
  const users = await prisma.user.findMany();
  const rows = await Promise.all(
    users.map(async (u) => {
      const predictions = await prisma.prediction.findMany({
        where: { userId: u.id, match: { matchday } },
        include: { match: true },
      });
      const boosts = await prisma.boost.findMany({ where: { userId: u.id, matchday } });
      const boostMatchIds = new Set(boosts.map((b) => b.matchId));
      let pts = 0;
      for (const p of predictions) {
        pts += boostMatchIds.has(p.matchId) ? p.pointsAwarded * 3 : p.pointsAwarded;
      }
      return { userId: u.id, nickname: u.nickname, avatar: u.avatar, points: pts, count: predictions.length };
    })
  );
  return rows.filter((r) => r.count > 0).sort((a, b) => b.points - a.points);
}
