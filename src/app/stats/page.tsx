import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Flag } from "@/components/Flag";
import { Emoji } from "@/components/Emoji";
import { userStyles, STYLE_RULES } from "@/lib/stats";

const STYLE_RULES_LEGEND = STYLE_RULES;

// Cache 5 min - statystyki nie muszą być na sekundę aktualne, admin invaliduje po wyniku.
export const revalidate = 300;

export default async function StatsPage({
  searchParams,
}: { searchParams: Promise<{ league?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { league: leagueParam } = await searchParams;

  // Pobierz ligi do których user należy
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { league: true },
    orderBy: { league: { createdAt: "asc" } },
  });
  // Domyślnie pierwsza liga usera (zero kategorii "wszyscy" - duplikat)
  const activeLeagueId =
    (leagueParam && memberships.some((m) => m.league.id === leagueParam) ? leagueParam : null)
    ?? memberships[0]?.league.id
    ?? null;
  const activeLeague = activeLeagueId ? memberships.find((m) => m.league.id === activeLeagueId)?.league : null;

  // Lista userId którzy są w wybranej lidze (gdy filtr jest aktywny)
  let memberUserIds: string[] | null = null;
  if (activeLeagueId) {
    const ms = await prisma.membership.findMany({ where: { leagueId: activeLeagueId }, select: { userId: true } });
    memberUserIds = ms.map((m) => m.userId);
  }
  const userFilter = memberUserIds ? { userId: { in: memberUserIds } } : {};
  const userIdInFilter = memberUserIds ? { id: { in: memberUserIds } } : {};

  // Wszystkie zapytania w 1 wsadzie równolegle (zamiast sequence await)
  const [
    totalUsers,
    totalPredictions,
    totalComments,
    totalBoosts,
    finishedMatches,
    championPicks,
    scorerPicks,
    allPreds,
    allUsersForLeader,
    boldPreds,
    matchesWithPicks,
    boostUsage,
    allBoosts,
    ranking,
    styles,
  ] = await Promise.all([
    prisma.user.count({ where: userIdInFilter }),
    prisma.prediction.count({ where: userFilter }),
    // Komentarze tylko gdy "wszyscy" (ogólne). Per liga = 0, bo trudno rozdzielić.
    activeLeagueId ? Promise.resolve(0) : prisma.comment.count(),
    prisma.boost.count({ where: userFilter }),
    prisma.match.count({ where: { homeScore: { not: null } } }),
    prisma.user.groupBy({
      by: ["predictedChampionId"],
      where: { predictedChampionId: { not: null }, ...userIdInFilter },
      _count: { _all: true },
      orderBy: { _count: { predictedChampionId: "desc" } },
      take: 5,
    }),
    prisma.prediction.groupBy({
      by: ["firstGoalPlayerId"],
      where: { firstGoalPlayerId: { not: null }, ...userFilter },
      _count: { _all: true },
      orderBy: { _count: { firstGoalPlayerId: "desc" } },
      take: 5,
    }),
    prisma.prediction.findMany({ where: userFilter, select: { homeScore: true, awayScore: true, pointsAwarded: true, userId: true, matchId: true } }),
    prisma.user.findMany({
      where: userIdInFilter,
      select: {
        id: true, nickname: true, avatar: true,
        predictions: { select: { pointsAwarded: true, matchId: true } },
        boosts: { select: { matchId: true } },
      },
    }),
    prisma.prediction.findMany({
      where: userFilter,
      orderBy: [{ homeScore: "desc" }, { awayScore: "desc" }],
      take: 1,
      include: { user: true, match: { include: { homeTeam: true, awayTeam: true } } },
    }),
    prisma.prediction.groupBy({
      by: ["matchId"],
      where: userFilter,
      _count: { _all: true },
      orderBy: { _count: { matchId: "desc" } },
      take: 1,
    }),
    prisma.boost.groupBy({
      by: ["matchId"],
      where: userFilter,
      _count: { _all: true },
      orderBy: { _count: { matchId: "desc" } },
      take: 1,
    }),
    prisma.boost.findMany({
      where: { match: { homeScore: { not: null } }, ...userFilter },
      include: {
        user: true,
        match: { include: { homeTeam: true, awayTeam: true } },
      },
    }),
    Promise.resolve({ series: [], matchdays: [] as number[] }),
    userStyles(memberUserIds),
  ]);

  // Drugi wsad: rzeczy które zależą od ID-ów z pierwszego
  const popularMatchId = matchesWithPicks[0]?.matchId;
  const boostMatchId = boostUsage[0]?.matchId;
  const allMatchIdsNeeded = [
    ...(popularMatchId ? [popularMatchId] : []),
    ...(boostMatchId ? [boostMatchId] : []),
  ];
  const [championTeams, scorerPlayers, extraMatches, boostPredictions] = await Promise.all([
    prisma.team.findMany({ where: { id: { in: championPicks.map((c) => c.predictedChampionId!).filter(Boolean) } } }),
    prisma.player.findMany({
      where: { id: { in: scorerPicks.map((s) => s.firstGoalPlayerId!).filter(Boolean) } },
      include: { team: true },
    }),
    allMatchIdsNeeded.length > 0
      ? prisma.match.findMany({ where: { id: { in: allMatchIdsNeeded } }, include: { homeTeam: true, awayTeam: true } })
      : Promise.resolve([] as any[]),
    // Wszystkie predykcje dla boostowanych meczów - 1 query zamiast N
    allBoosts.length > 0
      ? prisma.prediction.findMany({
          where: { OR: allBoosts.map((b) => ({ userId: b.userId, matchId: b.matchId })) },
          select: { userId: true, matchId: true, pointsAwarded: true },
        })
      : Promise.resolve([] as any[]),
  ]);

  const popularMatch = extraMatches.find((m) => m.id === popularMatchId) ?? null;
  const boostMatch = extraMatches.find((m) => m.id === boostMatchId) ?? null;

  // Leader (most points) - liczone w pamięci ze wstępnie wybranych pól
  const leader = allUsersForLeader
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

  const bold = boldPreds[0];

  // Złoty boost - liczony w pamięci z 1 query (boostPredictions)
  const predMap = new Map<string, number>();
  for (const p of boostPredictions) {
    predMap.set(`${p.userId}:${p.matchId}`, p.pointsAwarded);
  }
  let goldenBoost: { user: any; match: any; basePoints: number; boostedPoints: number } | null = null;
  for (const b of allBoosts) {
    const pts = predMap.get(`${b.userId}:${b.matchId}`);
    if (pts == null || pts <= 0) continue;
    const boostedPts = pts * 3;
    if (!goldenBoost || boostedPts > goldenBoost.boostedPoints) {
      goldenBoost = { user: b.user, match: b.match, basePoints: pts, boostedPoints: boostedPts };
    }
  }
  // Kolory do wykresu - cykliczna paleta
  void ranking; // wykres wyłączony - zbyt drogi w CU
  // MŚ 2026: 104 mecze (72 grupowe + 32 fazy pucharowej)
  const TOTAL_WC_MATCHES = 104;
  const progressPct = (finishedMatches / TOTAL_WC_MATCHES) * 100;
  const BAR_COLORS = ["bg-wc-gold", "bg-wc-blue", "bg-wc-green", "bg-accent", "bg-wc-lime"];

  return (
    <section className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-black mb-1">Statystyki turnieju 🌍</h1>
      <p className="text-app-muted mb-4">
        {activeLeague
          ? <>Liga: <b>{activeLeague.name}</b> ({totalUsers} {totalUsers === 1 ? "gracz" : "graczy"})</>
          : <>Brak lig - dołącz lub stwórz w zakładce Ligi.</>}
      </p>

      {memberships.length >= 2 && (
        <div className="flex gap-2 mb-5 overflow-x-auto -mx-1 px-1">
          {memberships.map((m) => (
            <Link
              key={m.league.id}
              href={`/stats?league=${m.league.id}`}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-bold ${activeLeagueId === m.league.id ? "bg-wc-red text-white" : "bg-app-hover text-app-muted"}`}
            >
              🏟️ {m.league.name}
            </Link>
          ))}
        </div>
      )}

      {/* HERO: progress bar - stadionowy LED */}
      <div className="stat-section mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <h2 style={{ marginBottom: 0 }}>Przebieg turnieju</h2>
          <div className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
            <b className="led" style={{ color: "#F1B434", fontFamily: "'Courier New', monospace" }}>{finishedMatches}</b>
            <span style={{ color: "rgba(255,255,255,0.5)" }}> / {TOTAL_WC_MATCHES} meczów</span>
          </div>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div className="h-full bg-gradient-to-r from-wc-red via-wc-gold to-wc-green" style={{ width: `${progressPct}%`, boxShadow: "0 0 12px rgba(241,180,52,0.5)" }} />
        </div>
        <div className="text-xs mt-2 text-right" style={{ color: "rgba(255,255,255,0.55)", fontFamily: "'Courier New', monospace", letterSpacing: "1px" }}>{progressPct.toFixed(0)}% ROZEGRANE</div>
      </div>

      {/* Big numbers row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <BigStat emoji="👥" value={totalUsers} label="Graczy" />
        <BigStat emoji="🎯" value={totalPredictions} label="Typów łącznie" />
        <BigStat emoji="⚡" value={totalBoosts} label="Użytych boostów" />
        {activeLeagueId ? (
          <BigStat emoji="🏟️" value={memberships.find((m) => m.league.id === activeLeagueId)?.league.name ?? ""} label="Liga" small />
        ) : (
          <BigStat emoji="💬" value={totalComments} label="Komentarzy" />
        )}
      </div>

      {/* Two cols layout - LED stadium scoreboard sections */}
      <div className="grid sm:grid-cols-2 gap-4">

        {/* Leader card */}
        {leader && leader.pts > 0 && (
          <div className="stat-section sm:col-span-2">
            <h2>👑 Aktualny lider</h2>
            <div className="flex items-center gap-4">
              <Emoji char={leader.user.avatar} size="2xl" alt={leader.user.nickname} />
              <div className="flex-1">
                <div className="font-black text-2xl text-white">{leader.user.nickname}</div>
                <div className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>{leader.count} typów</div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-black led" style={{ fontFamily: "'Courier New', monospace", color: "#F1B434" }}>{leader.pts}</div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(241,180,52,0.7)" }}>punktów</div>
              </div>
            </div>
          </div>
        )}

        {/* Champion picks */}
        <div className="stat-section">
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
        <div className="stat-section">
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
        <div className="stat-section">
          <h2 className="text-lg font-black mb-3">📊 Bramki w typach</h2>
          <div className="grid grid-cols-2 gap-3">
            <Mini value={avgGoals.toFixed(2)} label="średnia/mecz" color="text-wc-gold" />
            <Mini value={String(totalGoalsPredicted)} label="łącznie" color="text-app" />
            <Mini value={String(maxGoals)} label="max w 1 meczu" color="text-accent" />
            <Mini value={`${drawsPct.toFixed(0)}%`} label="typów na remis" color="text-app" />
          </div>
        </div>

        {/* Top scores */}
        <div className="stat-section">
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
          <div className="stat-section">
            <h2 className="text-lg font-black mb-3">🔥 Najodważniejszy typ</h2>
            <div className="flex items-center gap-3">
              <Emoji char={bold.user.avatar} size="xl" alt={bold.user.nickname} />
              <div className="flex-1 min-w-0">
                <div className="font-black truncate">{bold.user.nickname}</div>
                <div className="text-xs text-app-subtle truncate flex items-center gap-1">
                  <Flag emoji={bold.match.homeTeam.flag} size="xs" /> {bold.match.homeTeam.shortCode} vs {bold.match.awayTeam.shortCode} <Flag emoji={bold.match.awayTeam.flag} size="xs" />
                </div>
              </div>
              <div className="text-2xl font-black text-accent tabular-nums">{bold.homeScore}:{bold.awayScore}</div>
            </div>
          </div>
        )}

        {/* Złoty boost */}
        <div className="stat-section">
          <h2 className="text-lg font-black mb-3">💎 Złoty boost</h2>
          {goldenBoost ? (
            <div className="flex items-center gap-3">
              <Emoji char={goldenBoost.user.avatar} size="xl" alt={goldenBoost.user.nickname} />
              <div className="flex-1 min-w-0">
                <div className="font-black truncate">{goldenBoost.user.nickname}</div>
                <div className="text-xs text-app-subtle truncate flex items-center gap-1">
                  <Flag emoji={goldenBoost.match.homeTeam.flag} size="xs" /> {goldenBoost.match.homeTeam.shortCode} vs {goldenBoost.match.awayTeam.shortCode} <Flag emoji={goldenBoost.match.awayTeam.flag} size="xs" />
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-wc-gold tabular-nums">+{goldenBoost.boostedPoints}</div>
                <div className="text-[10px] text-app-subtle">z {goldenBoost.basePoints} ⚡</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-app-subtle">
              ⏳ Czeka na pierwszy udany boost. Kto zaboostuje mecz z trafionym typem, ten tu wpadnie.
            </div>
          )}
        </div>

        {/* Most popular match */}
        {popularMatch && (
          <div className="stat-section">
            <h2 className="text-lg font-black mb-3">👥 Najpopularniejszy mecz</h2>
            <div className="flex items-center gap-3">
              <Flag emoji={popularMatch.homeTeam.flag} size="lg" />
              <div className="flex-1">
                <div className="font-bold">{popularMatch.homeTeam.shortCode} vs {popularMatch.awayTeam.shortCode}</div>
                <div className="text-xs text-app-subtle">{popularMatch.stage}</div>
              </div>
              <Flag emoji={popularMatch.awayTeam.flag} size="lg" />
              <div className="chip bg-wc-lime/20 text-wc-lime border border-wc-lime/30">{matchesWithPicks[0]._count._all} typów</div>
            </div>
          </div>
        )}

        {/* Most boosted match */}
        {boostMatch && (
          <div className="stat-section">
            <h2 className="text-lg font-black mb-3">⚡ Najczęściej boostowany</h2>
            <div className="flex items-center gap-3">
              <Flag emoji={boostMatch.homeTeam.flag} size="lg" />
              <div className="flex-1">
                <div className="font-bold">{boostMatch.homeTeam.shortCode} vs {boostMatch.awayTeam.shortCode}</div>
                <div className="text-xs text-app-subtle">{boostMatch.stage}</div>
              </div>
              <Flag emoji={boostMatch.awayTeam.flag} size="lg" />
              <div className="chip bg-wc-gold/20 text-wc-gold border border-wc-gold/30">{boostUsage[0]._count._all}× ⚡</div>
            </div>
          </div>
        )}
      </div>

      {styles.length > 0 && (
        <div className="stat-section mt-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2>🎨 Style typowania ekipy</h2>
            <span className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.45)" }}>profile graczy</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {styles.map((s) => (
              <div key={s.userId} className="style-card">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Emoji char={s.avatar} size="md" alt={s.nickname} />
                  <span className="font-black text-sm truncate text-white">{s.nickname}</span>
                </div>
                <div className="text-5xl leading-none mb-2 text-center">{s.style.emoji}</div>
                <div className="style-card-label">{s.style.label}</div>
                <div className="mt-3 pt-3 grid grid-cols-3 gap-1" style={{ borderTop: "1px dashed rgba(241,180,52,0.2)" }}>
                  <StyleStat value={s.avgGoals.toFixed(1)} label="BR/MECZ" />
                  <StyleStat value={`${(s.drawRate * 100).toFixed(0)}%`} label="REMISY" />
                  <StyleStat value={String(s.total)} label="TYPÓW" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 stat-section" style={{ padding: "14px" }}>
            <div className="text-xs uppercase tracking-wider mb-3" style={{ color: "rgba(241,180,52,0.8)", fontFamily: "'Courier New', monospace" }}>
              ℹ Jak wyliczany jest styl
            </div>
            <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>
              Każdy typ uzyskuje "dopasowanie" do każdego stylu. Wygrywa najmocniejsze. Sprawdzane są:
              <b className="text-white"> dokładność trafień, średnia bramek, % remisów, % wysokich wyników (4+ br)</b>.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {STYLE_RULES_LEGEND.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="text-xl">{s.emoji}</span>
                  <div>
                    <div className="font-bold text-white">{s.label}</div>
                    <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function BigStat({ emoji, value, label, small }: { emoji: string; value: number | string; label: string; small?: boolean }) {
  return (
    <div className="led-tile">
      <div className="led-tile-emoji">{emoji}</div>
      <div className={`led-tile-value ${small ? "led-tile-value-small" : ""}`}>{value}</div>
      <div className="led-tile-label">{label}</div>
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

function StyleStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-sm font-black tabular-nums" style={{ fontFamily: "'Courier New', monospace", color: "#F1B434" }}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</div>
    </div>
  );
}
