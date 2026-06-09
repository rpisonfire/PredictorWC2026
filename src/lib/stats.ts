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

/** Statystyki konkretnego usera - używane głównie na profilu, więc OK że robi parę zapytań */
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

  return computeStats(finished, boostMatchIds, bonus, predictions.length);
}

function computeStats(
  finished: { homeScore: number; awayScore: number; firstGoalPlayerId: string | null; pointsAwarded: number; matchId: string; match: { homeScore: number | null; awayScore: number | null; firstGoalPlayerId: string | null } }[],
  boostMatchIds: Set<string>,
  bonus: number,
  predictionCount: number,
): UserStats {
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
    predictionCount,
    finishedCount,
    exactScoreHits,
    scorerHits,
    avgPointsPerMatch: finishedCount ? totalPoints / finishedCount : 0,
    accuracy: finishedCount ? (pointed / finishedCount) * 100 : 0,
    longestStreak,
    successfulBoosts,
  };
}

/** Ranking - jedno zapytanie pobiera WSZYSTKO, reszta jest w pamięci. */
export async function leaderboard(leagueId?: string) {
  // 1. Users + ich predykcje + ich boosty - wszystko w 1 query przez include
  const users = await prisma.user.findMany({
    where: leagueId ? { memberships: { some: { leagueId } } } : undefined,
    include: {
      predictions: { include: { match: true } },
      boosts: true,
    },
  });

  // 2. League dla bonusu mistrza
  const league = leagueId
    ? await prisma.league.findUnique({ where: { id: leagueId } })
    : null;

  // 3. Lista wszystkich kolejek (do spark)
  const allMatchdays = await prisma.match.findMany({
    select: { matchday: true },
    distinct: ["matchday"],
    orderBy: { matchday: "asc" },
  });
  const mds = allMatchdays.map((m) => m.matchday);

  const rows = users.map((u) => {
    const boostMatchIds = new Set(u.boosts.map((b) => b.matchId));
    const finished = u.predictions.filter((p) => p.match.homeScore !== null);

    const bonus = league?.actualChampionId && u.predictedChampionId === league.actualChampionId
      ? CHAMPION_BONUS
      : 0;

    const stats = computeStats(finished, boostMatchIds, bonus, u.predictions.length);

    // Sparkline: punkty per kolejka
    const ptsPerMd = new Map<number, number>();
    for (const p of finished) {
      const pts = boostMatchIds.has(p.matchId) ? p.pointsAwarded * 3 : p.pointsAwarded;
      ptsPerMd.set(p.match.matchday, (ptsPerMd.get(p.match.matchday) ?? 0) + pts);
    }
    const spark = mds.map((n) => ptsPerMd.get(n) ?? 0);

    return { userId: u.id, nickname: u.nickname, avatar: u.avatar, stats, badges: badgesFor(stats), spark };
  });

  return rows.sort((a, b) => b.stats.totalPoints - a.stats.totalPoints);
}

/** Stats ligi - liczone z tych samych danych co ranking, ale prościej. */
export async function leagueAggregateStats(leagueId: string) {
  const users = await prisma.user.findMany({
    where: { memberships: { some: { leagueId } } },
    include: {
      predictions: { include: { match: true } },
      boosts: true,
    },
  });
  const league = await prisma.league.findUnique({ where: { id: leagueId } });

  let totalPoints = 0;
  let count = 0;
  let bestMd: { userId: string; nickname: string; matchday: number; points: number } | null = null;

  for (const u of users) {
    const boostMatchIds = new Set(u.boosts.map((b) => b.matchId));
    const finished = u.predictions.filter((p) => p.match.homeScore !== null);

    const bonus = league?.actualChampionId && u.predictedChampionId === league.actualChampionId
      ? CHAMPION_BONUS
      : 0;

    const stats = computeStats(finished, boostMatchIds, bonus, u.predictions.length);
    totalPoints += stats.totalPoints;
    count++;

    // Per matchday breakdown
    const ptsPerMd = new Map<number, number>();
    for (const p of finished) {
      const pts = boostMatchIds.has(p.matchId) ? p.pointsAwarded * 3 : p.pointsAwarded;
      ptsPerMd.set(p.match.matchday, (ptsPerMd.get(p.match.matchday) ?? 0) + pts);
    }
    for (const [matchday, pts] of ptsPerMd.entries()) {
      if (!bestMd || pts > bestMd.points) {
        bestMd = { userId: u.id, nickname: u.nickname, matchday, points: pts };
      }
    }
  }

  return {
    players: count,
    avgPoints: count ? totalPoints / count : 0,
    bestMatchday: bestMd,
  };
}

/** Skumulowane punkty per kolejka dla każdego gracza - do wykresu liniowego */
export async function rankingOverTime(leagueId?: string) {
  const users = await prisma.user.findMany({
    where: leagueId ? { memberships: { some: { leagueId } } } : undefined,
    include: {
      predictions: { include: { match: true } },
      boosts: true,
    },
  });
  const league = leagueId ? await prisma.league.findUnique({ where: { id: leagueId } }) : null;
  const matchdays = await prisma.match.findMany({
    select: { matchday: true },
    distinct: ["matchday"],
    orderBy: { matchday: "asc" },
  });
  const mds = matchdays.map((m) => m.matchday);

  const series = users.map((u) => {
    const boostMatchIds = new Set(u.boosts.map((b) => b.matchId));
    const ptsPerMd = new Map<number, number>();
    for (const p of u.predictions) {
      if (p.match.homeScore == null) continue;
      const pts = boostMatchIds.has(p.matchId) ? p.pointsAwarded * 3 : p.pointsAwarded;
      ptsPerMd.set(p.match.matchday, (ptsPerMd.get(p.match.matchday) ?? 0) + pts);
    }
    const champBonus = league?.actualChampionId && u.predictedChampionId === league.actualChampionId ? CHAMPION_BONUS : 0;
    // cumulative
    let cum = champBonus;
    const points = mds.map((md) => {
      cum += ptsPerMd.get(md) ?? 0;
      return cum;
    });
    return { userId: u.id, nickname: u.nickname, avatar: u.avatar, points };
  });

  return { series, matchdays: mds };
}

/** Statystyki interesujących meczów */
export async function matchInsights() {
  const matches = await prisma.match.findMany({
    where: { homeScore: { not: null } },
    include: {
      homeTeam: true,
      awayTeam: true,
      predictions: true,
    },
  });

  let easiest: { match: any; hitRate: number } | null = null;
  let killing: { match: any; total: number } | null = null;
  let divisive: { match: any; uniqueScores: number; total: number } | null = null;

  for (const m of matches) {
    if (m.predictions.length === 0) continue;
    const withPts = m.predictions.filter((p) => p.pointsAwarded > 0).length;
    const hitRate = withPts / m.predictions.length;
    if (!easiest || hitRate > easiest.hitRate) easiest = { match: m, hitRate };
    if (withPts === 0 && m.predictions.length >= 2) {
      if (!killing || m.predictions.length > killing.total) killing = { match: m, total: m.predictions.length };
    }
    const uniqueScores = new Set(m.predictions.map((p) => `${p.homeScore}:${p.awayScore}`)).size;
    if (!divisive || uniqueScores > divisive.uniqueScores) divisive = { match: m, uniqueScores, total: m.predictions.length };
  }

  return { easiest, killing, divisive };
}

/**
 * Styl typowania - wyliczany przez "score" dla każdego stylu, wybierany ten o najwyższym dopasowaniu.
 * Dzięki temu nie ma sztywnej kaskady która pomija przypadki.
 */
export const STYLE_RULES = [
  { key: "beton",       emoji: "🧱", label: "Beton",       desc: "Typuje dużo remisów (≥30%)" },
  { key: "pesymista",   emoji: "🧊", label: "Pesymista",   desc: "Średnio ≤1.5 br/mecz" },
  { key: "realista",    emoji: "⚖️", label: "Realista",    desc: "Typowy wynik 1-2 br na drużynę" },
  { key: "optymista",   emoji: "🌈", label: "Optymista",   desc: "Średnio ≥2.8 br/mecz" },
  { key: "hazardzista", emoji: "🎰", label: "Hazardzista", desc: "Typuje wysokie wyniki (4+ br) ≥25% meczów" },
  { key: "snajper",     emoji: "🎯", label: "Snajper",     desc: "Trafia dokładny wynik ≥25% rozegranych" },
] as const;

export async function userStyles() {
  const users = await prisma.user.findMany({
    include: { predictions: { include: { match: true } } },
  });
  return users
    .filter((u) => u.predictions.length >= 3)
    .map((u) => {
      const total = u.predictions.length;
      const goalsSum = u.predictions.reduce((s, p) => s + p.homeScore + p.awayScore, 0);
      const avgGoals = goalsSum / total;
      const draws = u.predictions.filter((p) => p.homeScore === p.awayScore).length;
      const drawRate = draws / total;
      const highScoring = u.predictions.filter((p) => p.homeScore + p.awayScore >= 4).length;
      const highRate = highScoring / total;
      const finished = u.predictions.filter((p) => p.match.homeScore !== null);
      const exact = finished.filter((p) => p.homeScore === p.match.homeScore && p.awayScore === p.match.awayScore).length;
      const exactRate = finished.length >= 3 ? exact / finished.length : 0;

      // Score per styl - większy = mocniejsze dopasowanie
      const scores: Record<string, number> = {
        snajper:     exactRate >= 0.25 ? exactRate * 5 : 0,                    // jasno wygrywa jeśli trafia często
        hazardzista: highRate >= 0.25 ? highRate * 3 : 0,                       // niezależnie od reszty
        beton:       drawRate >= 0.30 ? drawRate * 3 : 0,
        pesymista:   avgGoals <= 1.5 ? (1.5 - avgGoals) * 2 : 0,
        optymista:   avgGoals >= 2.8 ? (avgGoals - 2.5) * 1.5 : 0,
        realista:    avgGoals > 1.5 && avgGoals < 2.8 && drawRate < 0.3 && highRate < 0.25 ? 1 : 0,
      };

      const winner = (Object.entries(scores) as [string, number][])
        .sort((a, b) => b[1] - a[1])[0];
      const styleRule = STYLE_RULES.find((s) => s.key === winner[0]) ?? STYLE_RULES.find((s) => s.key === "realista")!;

      return {
        userId: u.id, nickname: u.nickname, avatar: u.avatar,
        total, avgGoals, drawRate, highRate, exactRate,
        style: { emoji: styleRule.emoji, label: styleRule.label, desc: styleRule.desc },
      };
    })
    .sort((a, b) => b.total - a.total);
}

/** Ranking dla konkretnej kolejki - jedno query */
export async function leaderboardForMatchday(matchday: number, leagueId?: string) {
  const users = await prisma.user.findMany({
    where: leagueId ? { memberships: { some: { leagueId } } } : undefined,
    include: {
      predictions: { where: { match: { matchday } } },
      boosts: { where: { matchday } },
    },
  });

  return users
    .map((u) => {
      const boostMatchIds = new Set(u.boosts.map((b) => b.matchId));
      let pts = 0;
      for (const p of u.predictions) {
        pts += boostMatchIds.has(p.matchId) ? p.pointsAwarded * 3 : p.pointsAwarded;
      }
      return { userId: u.id, nickname: u.nickname, avatar: u.avatar, points: pts, count: u.predictions.length };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.points - a.points);
}
