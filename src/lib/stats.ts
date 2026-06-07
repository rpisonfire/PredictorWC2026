import { prisma } from "./db";

export type UserStats = {
  totalPoints: number;
  predictionCount: number;
  finishedCount: number;
  exactScoreHits: number;
  scorerHits: number;
  avgPointsPerMatch: number;
  accuracy: number;
  longestStreak: number;
  successfulBoosts: number;
};

export type Badge = {
  key: string;
  emoji: string;
  label: string;
  description: string;
};

export const CHAMPION_BONUS = 10;

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

/** Bonus za trafionego mistrza w konkretnej lidze. */
export async function championBonusForUserInLeague(userId: string, leagueId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!user?.predictedChampionId || !league?.actualChampionId) return 0;
  return user.predictedChampionId === league.actualChampionId ? CHAMPION_BONUS : 0;
}

/** Najlepszy aktualny bonus we wszystkich ligach (do wyświetlenia w profilu) */
export async function championBonusForUser(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberships: { include: { league: true } } },
  });
  if (!user?.predictedChampionId) return 0;
  const hit = user.memberships.some(
    (m) => m.league.actualChampionId && m.league.actualChampionId === user.predictedChampionId
  );
  return hit ? CHAMPION_BONUS : 0;
}

export async function statsForUser(userId: string, leagueId?: string): Promise<UserStats> {
  const predictions = await prisma.prediction.findMany({
    where: { userId },
    include: { match: true },
    orderBy: { match: { kickoff: "asc" } },
  });
  const boosts = await prisma.boost.findMany({ where: { userId } });
  const boostMatchIds = new Set(boosts.map((b) => b.matchId));

  const finished = predictions.filter((p) => p.match.homeScore !== null);

  const bonus = leagueId
    ? await championBonusForUserInLeague(userId, leagueId)
    : await championBonusForUser(userId);

  let totalPoints = bonus;
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

/** Ranking dla podanej ligi (lub wszystkich userów, jeśli leagueId pominięte). */
export async function leaderboard(leagueId?: string) {
  const users = leagueId
    ? await prisma.user.findMany({ where: { memberships: { some: { leagueId } } } })
    : await prisma.user.findMany();

  // Spark per user — punkty per kolejka
  const allMatchdays = await prisma.match.findMany({
    select: { matchday: true },
    distinct: ["matchday"],
    orderBy: { matchday: "asc" },
  });
  const mds = allMatchdays.map((m) => m.matchday);

  const rows = await Promise.all(
    users.map(async (u) => {
      const stats = await statsForUser(u.id, leagueId);

      // sparkline: punkty per kolejka (tylko rozegrane mecze)
      const predictions = await prisma.prediction.findMany({
        where: { userId: u.id, match: { homeScore: { not: null } } },
        include: { match: true },
      });
      const boosts = await prisma.boost.findMany({ where: { userId: u.id } });
      const boostSet = new Set(boosts.map((b) => b.matchId));
      const ptsPerMd = new Map<number, number>();
      for (const p of predictions) {
        const pts = boostSet.has(p.matchId) ? p.pointsAwarded * 3 : p.pointsAwarded;
        ptsPerMd.set(p.match.matchday, (ptsPerMd.get(p.match.matchday) ?? 0) + pts);
      }
      const spark = mds.map((n) => ptsPerMd.get(n) ?? 0);

      return { userId: u.id, nickname: u.nickname, avatar: u.avatar, stats, badges: badgesFor(stats), spark };
    })
  );
  return rows.sort((a, b) => b.stats.totalPoints - a.stats.totalPoints);
}

/** Stats agregowane dla całej ligi */
export async function leagueAggregateStats(leagueId: string) {
  const users = await prisma.user.findMany({ where: { memberships: { some: { leagueId } } } });
  let totalPoints = 0;
  let count = 0;
  let bestMd: { userId: string; nickname: string; matchday: number; points: number } | null = null;

  const matchdays = await prisma.match.findMany({
    select: { matchday: true }, distinct: ["matchday"], orderBy: { matchday: "asc" },
  });

  for (const u of users) {
    const stats = await statsForUser(u.id, leagueId);
    totalPoints += stats.totalPoints;
    count++;
    for (const md of matchdays) {
      const predictions = await prisma.prediction.findMany({
        where: { userId: u.id, match: { matchday: md.matchday } },
      });
      const boosts = await prisma.boost.findMany({ where: { userId: u.id, matchday: md.matchday } });
      const boostSet = new Set(boosts.map((b) => b.matchId));
      let pts = 0;
      for (const p of predictions) pts += boostSet.has(p.matchId) ? p.pointsAwarded * 3 : p.pointsAwarded;
      if (!bestMd || pts > bestMd.points) bestMd = { userId: u.id, nickname: u.nickname, matchday: md.matchday, points: pts };
    }
  }

  return {
    players: count,
    avgPoints: count ? totalPoints / count : 0,
    bestMatchday: bestMd,
  };
}

export async function leaderboardForMatchday(matchday: number, leagueId?: string) {
  const users = leagueId
    ? await prisma.user.findMany({ where: { memberships: { some: { leagueId } } } })
    : await prisma.user.findMany();
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
