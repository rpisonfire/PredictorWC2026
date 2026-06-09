import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Flag } from "@/components/Flag";
import { Emoji } from "@/components/Emoji";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [
    totalUsers,
    totalPredictions,
    totalComments,
    totalBoosts,
    finishedMatches,
    totalMatches,
    championPicks,
    scorerPicks,
    allPreds,
    topScorerUser,
    boldPreds,
    matchesWithPicks,
    boostUsage,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.prediction.count(),
    prisma.comment.count(),
    prisma.boost.count(),
    prisma.match.count({ where: { homeScore: { not: null } } }),
    prisma.match.count(),
    prisma.user.groupBy({
      by: ["predictedChampionId"],
      where: { predictedChampionId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { predictedChampionId: "desc" } },
      take: 5,
    }),
    prisma.prediction.groupBy({
      by: ["firstGoalPlayerId"],
      where: { firstGoalPlayerId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { firstGoalPlayerId: "desc" } },
      take: 5,
    }),
    prisma.prediction.findMany({ select: { homeScore: true, awayScore: true, pointsAwarded: true, userId: true, matchId: true } }),
    prisma.user.findMany({
      include: { predictions: true, boosts: true },
    }),
    prisma.prediction.findMany({
      orderBy: [{ homeScore: "desc" }, { awayScore: "desc" }],
      take: 1,
      include: { user: true, match: { include: { homeTeam: true, awayTeam: true } } },
    }),
    prisma.prediction.groupBy({
      by: ["matchId"],
      _count: { _all: true },
      orderBy: { _count: { matchId: "desc" } },
      take: 3,
    }),
    prisma.boost.groupBy({
      by: ["matchId"],
      _count: { _all: true },
      orderBy: { _count: { matchId: "desc" } },
      take: 1,
    }),
  ]);

  const [championTeams, scorerPlayers] = await Promise.all([
    prisma.team.findMany({ where: { id: { in: championPicks.map((c) => c.predictedChampionId!).filter(Boolean) } } }),
    prisma.player.findMany({
      where: { id: { in: scorerPicks.map((s) => s.firstGoalPlayerId!).filter(Boolean) } },
      include: { team: true },
    }),
  ]);

  // Leader (most points)
  const leader = topScorerUser
    .map((u) => {
      const boostSet = new Set(u.boosts.map((b) => b.matchId));
      const pts = u.predictions.reduce(
        (sum, p) => sum + (boostSet.has(p.matchId) ? p.pointsAwarded * 3 : p.pointsAwarded), 0,
      );
      return { user: u, pts, count: u.predictions.length };
    })
    .sort((a, b) => b.pts - a.pts)[0];

  const champRows = championPicks.map((c) => ({
    team: championTeams.find((t) => t.id === c.predictedChampionId),
    count: c._count._all,
  }));
  const scorerRows = scorerPicks.map((s) => ({
    player: scorerPlayers.find((p) => p.id === s.firstGoalPlayerId),
    count: s._count._all,
  }));

  // Goals stats
  const totalGoalsPredicted = allPreds.reduce((s, p) => s + p.homeScore + p.awayScore, 0);
  const avgGoals = allPreds.length ? (totalGoalsPredicted / allPreds.length) : 0;
  const maxGoals = allPreds.reduce((m, p) => Math.max(m, p.homeScore + p.awayScore), 0);
  const draws = allPreds.filter((p) => p.homeScore === p.awayScore).length;
  const drawsPct = allPreds.length ? (draws / allPreds.length) * 100 : 0;

  // Top scores
  const scoreCounts = new Map<string, number>();
  for (const p of allPreds) {
    const key = `${p.homeScore}:${p.awayScore}`;
    scoreCounts.set(key, (scoreCounts.get(key) ?? 0) + 1);
  }
  const topScores = [...scoreCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Most popular match (most predictions)
  const popularMatchId = matchesWithPicks[0]?.matchId;
  const popularMatch = popularMatchId
    ? await prisma.match.findUnique({ where: { id: popularMatchId }, include: { homeTeam: true, awayTeam: true } })
    : null;

  // Most boosted match
  const boostMatchId = boostUsage[0]?.matchId;
  const boostMatch = boostMatchId
    ? await prisma.match.findUnique({ where: { id: boostMatchId }, include: { homeTeam: true, awayTeam: true } })
    : null;

  const bold = boldPreds[0];
  // MŚ 2026: 104 mecze (72 grupowe + 32 fazy pucharowej)
  const TOTAL_WC_MATCHES = 104;
  const progressPct = (finishedMatches / TOTAL_WC_MATCHES) * 100;
  const BAR_COLORS = ["bg-wc-gold", "bg-wc-blue", "bg-wc-green", "bg-accent", "bg-wc-lime"];

  return (
    <section className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-black mb-1">Statystyki turnieju 🌍</h1>
      <p className="text-app-muted mb-6">Agregaty z całej apki - kto, co i jak typuje.</p>

      {/* HERO: progress bar */}
      <div className="card p-5 mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-sm uppercase tracking-wider text-app-subtle">Przebieg turnieju</div>
          <div className="text-sm text-app-muted"><b className="text-app">{finishedMatches}</b> / {TOTAL_WC_MATCHES} meczów</div>
        </div>
        <div className="h-3 rounded-full bg-app-hover overflow-hidden">
          <div className="h-full bg-gradient-to-r from-wc-red via-wc-gold to-wc-green" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="text-xs text-app-subtle mt-2 text-right">{progressPct.toFixed(0)}% rozegrane</div>
      </div>

      {/* Big numbers row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <BigStat emoji="👥" value={totalUsers} label="Graczy" />
        <BigStat emoji="🎯" value={totalPredictions} label="Typów łącznie" />
        <BigStat emoji="⚡" value={totalBoosts} label="Użytych boostów" />
        <BigStat emoji="💬" value={totalComments} label="Komentarzy" />
      </div>

      {/* Two cols layout */}
      <div className="grid sm:grid-cols-2 gap-4">

        {/* Leader card */}
        {leader && leader.pts > 0 && (
          <div className="card p-5 sm:col-span-2 bg-gradient-to-br from-wc-gold/10 to-transparent border-wc-gold/30">
            <div className="text-xs uppercase tracking-wider text-app-subtle mb-2">👑 Aktualny lider</div>
            <div className="flex items-center gap-4">
              <Emoji char={leader.user.avatar} size="2xl" alt={leader.user.nickname} />
              <div className="flex-1">
                <div className="font-black text-2xl">{leader.user.nickname}</div>
                <div className="text-sm text-app-muted">{leader.count} typów</div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-black text-wc-gold tabular-nums">{leader.pts}</div>
                <div className="text-xs text-app-subtle uppercase tracking-wider">punktów</div>
              </div>
            </div>
          </div>
        )}

        {/* Champion picks */}
        <div className="card p-5">
          <h2 className="text-lg font-black mb-3">🏆 Najczęstszy typ na mistrza</h2>
          {champRows.length === 0 && <div className="text-app-subtle text-sm">Nikt jeszcze nie wybrał.</div>}
          <ul className="space-y-3">
            {champRows.map(({ team, count }, i) => {
              const pct = totalUsers ? (count / totalUsers) * 100 : 0;
              const color = BAR_COLORS[i % BAR_COLORS.length];
              return team ? (
                <li key={team.id}>
                  <div className="flex items-center gap-2 mb-1">
                    <Flag emoji={team.flag} size="md" alt={team.name} />
                    <span className="font-bold flex-1 truncate">{team.name}</span>
                    <span className={`text-sm font-black tabular-nums ${color.replace("bg-", "text-")}`}>{pct.toFixed(0)}%</span>
                    <span className="text-xs text-app-subtle w-8 text-right">({count})</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-app-hover overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </li>
              ) : null;
            })}
          </ul>
        </div>

        {/* Top scorer picks */}
        <div className="card p-5">
          <h2 className="text-lg font-black mb-3">⚽ Najczęstszy strzelec</h2>
          {scorerRows.length === 0 && <div className="text-app-subtle text-sm">Brak typów na strzelców.</div>}
          <ul className="space-y-2">
            {scorerRows.map(({ player, count }) => player ? (
              <li key={player.id} className="flex items-center gap-2">
                <PlayerAvatar name={player.name} photoUrl={player.photoUrl} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{player.name}</div>
                  <div className="text-xs text-app-subtle">{player.team.flag} {player.team.name}</div>
                </div>
                <div className="chip bg-wc-gold/15 text-wc-gold">{count}×</div>
              </li>
            ) : null)}
          </ul>
        </div>

        {/* Goals stats card */}
        <div className="card p-5">
          <h2 className="text-lg font-black mb-3">📊 Bramki w typach</h2>
          <div className="grid grid-cols-2 gap-3">
            <Mini value={avgGoals.toFixed(2)} label="średnia/mecz" color="text-wc-gold" />
            <Mini value={String(totalGoalsPredicted)} label="łącznie" color="text-app" />
            <Mini value={String(maxGoals)} label="max w 1 meczu" color="text-accent" />
            <Mini value={`${drawsPct.toFixed(0)}%`} label="typów na remis" color="text-app" />
          </div>
        </div>

        {/* Top scores */}
        <div className="card p-5">
          <h2 className="text-lg font-black mb-3">🎯 Top wyniki typowane</h2>
          {topScores.length === 0 && <div className="text-app-subtle text-sm">Brak typów.</div>}
          <ul className="space-y-1.5">
            {topScores.map(([score, n], i) => {
              const maxN = topScores[0][1];
              const pct = (n / maxN) * 100;
              const color = BAR_COLORS[i % BAR_COLORS.length];
              return (
                <li key={score}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-black tabular-nums w-12">{score}</span>
                    <div className="flex-1 h-2 rounded-full bg-app-hover overflow-hidden">
                      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm text-app-muted tabular-nums w-8 text-right">{n}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Boldest prediction */}
        {bold && (bold.homeScore + bold.awayScore) >= 4 && (
          <div className="card p-5">
            <h2 className="text-lg font-black mb-3">🔥 Najodważniejszy typ</h2>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{bold.user.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className="font-black truncate">{bold.user.nickname}</div>
                <div className="text-xs text-app-subtle truncate">
                  {bold.match.homeTeam.flag} {bold.match.homeTeam.shortCode} vs {bold.match.awayTeam.shortCode} {bold.match.awayTeam.flag}
                </div>
              </div>
              <div className="text-2xl font-black text-accent tabular-nums">{bold.homeScore}:{bold.awayScore}</div>
            </div>
          </div>
        )}

        {/* Most popular match */}
        {popularMatch && (
          <div className="card p-5">
            <h2 className="text-lg font-black mb-3">👥 Najpopularniejszy mecz</h2>
            <div className="flex items-center gap-3">
              <Flag emoji={popularMatch.homeTeam.flag} size="lg" />
              <div className="flex-1">
                <div className="font-bold">{popularMatch.homeTeam.shortCode} vs {popularMatch.awayTeam.shortCode}</div>
                <div className="text-xs text-app-subtle">{popularMatch.stage}</div>
              </div>
              <Flag emoji={popularMatch.awayTeam.flag} size="lg" />
              <div className="chip bg-wc-blue/15 text-wc-blue">{matchesWithPicks[0]._count._all} typów</div>
            </div>
          </div>
        )}

        {/* Most boosted match */}
        {boostMatch && (
          <div className="card p-5">
            <h2 className="text-lg font-black mb-3">⚡ Najczęściej boostowany</h2>
            <div className="flex items-center gap-3">
              <Flag emoji={boostMatch.homeTeam.flag} size="lg" />
              <div className="flex-1">
                <div className="font-bold">{boostMatch.homeTeam.shortCode} vs {boostMatch.awayTeam.shortCode}</div>
                <div className="text-xs text-app-subtle">{boostMatch.stage}</div>
              </div>
              <Flag emoji={boostMatch.awayTeam.flag} size="lg" />
              <div className="chip bg-wc-gold/15 text-wc-gold">{boostUsage[0]._count._all}× ⚡</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function BigStat({ emoji, value, label }: { emoji: string; value: number; label: string }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-3xl font-black tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-app-subtle mt-1">{label}</div>
    </div>
  );
}

function Mini({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="rounded-xl bg-app-hover p-3 text-center">
      <div className={`text-2xl font-black tabular-nums ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-app-subtle mt-0.5">{label}</div>
    </div>
  );
}
