import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { PlayerAvatar } from "@/components/PlayerAvatar";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const totalUsers = await prisma.user.count();

  // Najczęściej typowany mistrz
  const championPicks = await prisma.user.groupBy({
    by: ["predictedChampionId"],
    where: { predictedChampionId: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { predictedChampionId: "desc" } },
    take: 5,
  });
  const championTeams = await prisma.team.findMany({
    where: { id: { in: championPicks.map((c) => c.predictedChampionId!).filter(Boolean) } },
  });
  const champRows = championPicks.map((c) => {
    const team = championTeams.find((t) => t.id === c.predictedChampionId);
    return { team, count: c._count._all };
  });

  // Najczęściej typowany strzelec
  const scorerPicks = await prisma.prediction.groupBy({
    by: ["firstGoalPlayerId"],
    where: { firstGoalPlayerId: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { firstGoalPlayerId: "desc" } },
    take: 5,
  });
  const scorerPlayers = await prisma.player.findMany({
    where: { id: { in: scorerPicks.map((s) => s.firstGoalPlayerId!).filter(Boolean) } },
    include: { team: true },
  });
  const scorerRows = scorerPicks.map((s) => {
    const player = scorerPlayers.find((p) => p.id === s.firstGoalPlayerId);
    return { player, count: s._count._all };
  });

  // Średnia liczba bramek w typowanych meczach
  const allPreds = await prisma.prediction.findMany({ select: { homeScore: true, awayScore: true } });
  const avgGoals = allPreds.length
    ? (allPreds.reduce((sum, p) => sum + p.homeScore + p.awayScore, 0) / allPreds.length).toFixed(2)
    : "-";

  // Najpopularniejszy wynik
  const scoreCounts = new Map<string, number>();
  for (const p of allPreds) {
    const key = `${p.homeScore}:${p.awayScore}`;
    scoreCounts.set(key, (scoreCounts.get(key) ?? 0) + 1);
  }
  const topScores = [...scoreCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <section className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-black mb-1">Statystyki turnieju 🌍</h1>
      <p className="text-app-muted mb-6">Co typują kumple - agregaty z całej apki.</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-lg font-black mb-3">🏆 Najczęstszy typ na mistrza</h2>
          {champRows.length === 0 && <div className="text-app-subtle text-sm">Nikt jeszcze nie wybrał.</div>}
          <ul className="space-y-2">
            {champRows.map(({ team, count }) => {
              const pct = totalUsers ? (count / totalUsers) * 100 : 0;
              return team ? (
                <li key={team.id}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{team.flag}</span>
                    <span className="font-bold flex-1 truncate">{team.name}</span>
                    <span className="text-sm font-black text-wc-gold tabular-nums">{pct.toFixed(0)}%</span>
                    <span className="text-xs text-app-subtle">({count})</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-app-hover overflow-hidden">
                    <div className="h-full bg-wc-gold" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              ) : null;
            })}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-black mb-3">⚽ Najczęstszy strzelec</h2>
          {scorerRows.length === 0 && <div className="text-app-subtle text-sm">Brak typów na strzelców.</div>}
          <ul className="space-y-2">
            {scorerRows.map(({ player, count }) => player ? (
              <li key={player.id} className="flex items-center gap-2">
                <PlayerAvatar name={player.name} photoUrl={player.photoUrl} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{player.name}</div>
                  <div className="text-xs text-app-subtle">{player.team.flag} {player.team.name}</div>
                </div>
                <div className="chip bg-wc-gold/15 text-wc-gold">{count}×</div>
              </li>
            ) : null)}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-black mb-3">📊 Średnia w typach</h2>
          <div className="text-4xl font-black text-wc-gold tabular-nums">{avgGoals}</div>
          <p className="text-sm text-app-muted mt-1">bramek na mecz (średnia z {allPreds.length} typów)</p>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-black mb-3">🎯 Top wyniki typowane</h2>
          {topScores.length === 0 && <div className="text-app-subtle text-sm">Brak typów.</div>}
          <ul className="space-y-2">
            {topScores.map(([score, n]) => (
              <li key={score} className="flex items-center justify-between">
                <span className="text-xl font-black tabular-nums">{score}</span>
                <span className="text-sm text-app-subtle">{n} {n === 1 ? "typ" : n < 5 ? "typy" : "typów"}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
