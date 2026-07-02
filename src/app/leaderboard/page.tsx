import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { leaderboard, leaderboardForMatchday, leagueAggregateStats } from "@/lib/stats";
import { matchdayLabel } from "@/lib/stageLabel";

// Ranking zmienia się tylko po wpisaniu wyniku - cache na 15 min (admin invaliduje natychmiast po setResult).
export const revalidate = 900;
import { Sparkline } from "@/components/Sparkline";
import { PaniniCardLarge, PaniniCardMini } from "@/components/PaniniCard";
import { Emoji } from "@/components/Emoji";

export default async function Leaderboard({
  searchParams,
}: { searchParams: Promise<{ md?: string; league?: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const { md, league } = await searchParams;

  // Pobierz ligi do których należy user
  const memberships = await prisma.membership.findMany({
    where: { userId: me.id },
    include: { league: true },
    orderBy: { league: { createdAt: "asc" } },
  });
  if (memberships.length === 0) {
    return (
      <section className="max-w-md mx-auto py-10 text-center">
        <div className="text-6xl mb-4">🏟️</div>
        <h1 className="text-3xl font-black mb-2">Brak ligi</h1>
        <p className="text-app-muted mb-6">Nie należysz do żadnej ligi.</p>
        <Link href="/leagues" className="btn-primary">Dołącz lub stwórz</Link>
      </section>
    );
  }

  const activeLeagueId = league && memberships.some((m) => m.league.id === league)
    ? league
    : memberships[0].league.id;

  const matchdays = await prisma.match.findMany({
    select: { matchday: true },
    distinct: ["matchday"],
    orderBy: { matchday: "asc" },
  });
  const mds = matchdays.map((m) => m.matchday);
  const activeMd = md ? Number(md) : null;

  return (
    <section className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-black mb-1">Ranking 🏆</h1>
      <p className="text-app-muted mb-4">Kto rządzi w lidze.</p>

      {memberships.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto -mx-1 px-1">
          {memberships.map((m) => (
            <Link
              key={m.league.id}
              href={`/leaderboard?league=${m.league.id}${activeMd != null ? `&md=${activeMd}` : ""}`}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-bold ${m.league.id === activeLeagueId ? "bg-wc-blue text-white" : "bg-app-hover text-app-muted hover:bg-app-hover"}`}
            >
              {m.league.name}
            </Link>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-5 overflow-x-auto -mx-1 px-1">
        <Tab href={`/leaderboard?league=${activeLeagueId}`} active={activeMd === null} label="Ogólna" />
        {mds.map((n) => (
          <Tab
            key={n}
            href={`/leaderboard?league=${activeLeagueId}&md=${n}`}
            active={activeMd === n}
            label={matchdayLabel(n)}
          />
        ))}
      </div>

      {activeMd === null
        ? <Overall leagueId={activeLeagueId} meId={me.id} />
        : <PerMatchday md={activeMd} leagueId={activeLeagueId} meId={me.id} />
      }

      <BadgeLegend />
    </section>
  );
}

function BadgeLegend() {
  const badges = [
    { emoji: "🎯", label: "Snajper", desc: "3+ dokładne wyniki w turnieju" },
    { emoji: "👑", label: "Król strzelców", desc: "5+ trafionych strzelców pierwszego gola" },
    { emoji: "⚡", label: "Mistrzowski boost", desc: "dokładny wynik trafiony na mnożniku x3" },
    { emoji: "🔥", label: "Gorący", desc: "3+ ostatnie mecze z rzędu po min. 5 pkt - znika po słabszym meczu" },
    { emoji: "🧊", label: "Lodowaty", desc: "0 pkt w ostatnim rozegranym meczu - znika po punktowanym typie" },
    { emoji: "🔥N", label: "Seria", desc: "liczba kolejnych punktowanych typów z rzędu (od 3 w górę)" },
  ];
  const perMd = [
    { emoji: "⚡", label: "Boost trafiony", desc: "użył mnożnika x3 w tej kolejce i zdobył punkty" },
    { emoji: "💤", label: "Boost spalony", desc: "użył mnożnika x3, ale mecz dał 0 pkt" },
    { emoji: "❌", label: "Boost przepadł", desc: "nie użył boosta w tej kolejce" },
  ];
  return (
    <details className="mt-8">
      <summary className="collapse-header">
        <span className="flex items-center gap-2">
          <span className="collapse-chev">▶</span>
          Co oznaczają odznaki?
        </span>
      </summary>
      <div className="stat-section mt-3">
        <h2>🏅 Odznaki (ranking ogólny)</h2>
        <ul className="space-y-2 mb-5">
          {badges.map((b) => (
            <li key={b.label} className="flex items-start gap-3 text-sm">
              <span className="text-xl w-8 text-center shrink-0">{b.emoji}</span>
              <span><b className="text-white">{b.label}</b> <span className="text-app-muted">- {b.desc}</span></span>
            </li>
          ))}
        </ul>
        <h2>⚡ Boost (widok kolejki)</h2>
        <ul className="space-y-2">
          {perMd.map((b) => (
            <li key={b.label} className="flex items-start gap-3 text-sm">
              <span className="text-xl w-8 text-center shrink-0">{b.emoji}</span>
              <span><b className="text-white">{b.label}</b> <span className="text-app-muted">- {b.desc}</span></span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function Tab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-bold ${active ? "bg-wc-red text-white" : "bg-app-hover text-app-muted hover:bg-app-hover"}`}
    >
      {label}
    </Link>
  );
}

async function Overall({ leagueId, meId }: { leagueId: string; meId: string }) {
  const [rows, agg, rankUsers] = await Promise.all([
    leaderboard(leagueId),
    leagueAggregateStats(leagueId),
    // Wzloty i upadki - snapshot rankingu globalnego (currentRank vs previousRank)
    prisma.user.findMany({
      where: {
        memberships: { some: { leagueId } },
        currentRank: { not: null },
        previousRank: { not: null },
      },
      select: { nickname: true, avatar: true, currentRank: true, previousRank: true },
    }),
  ]);
  if (rows.length === 0) return <Empty />;
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  // Największy skok w górę i największy spadek od ostatniego wpisanego wyniku
  const movers = rankUsers
    .map((u) => ({ ...u, delta: u.previousRank! - u.currentRank! }))
    .filter((u) => u.delta !== 0);
  const climber = movers.filter((u) => u.delta > 0).sort((a, b) => b.delta - a.delta)[0];
  const faller = movers.filter((u) => u.delta < 0).sort((a, b) => a.delta - b.delta)[0];

  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-6">
        <Mini label="Graczy" value={String(agg.players)} />
        <Mini label="Średnia pkt" value={agg.avgPoints.toFixed(1)} />
        <Mini label="Najlepsza kolejka" value={agg.bestMatchday ? `${agg.bestMatchday.points} (${agg.bestMatchday.nickname})` : "-"} small />
      </div>

      {(climber || faller) && (
        <div className="grid grid-cols-2 gap-2 mb-6">
          {climber && (
            <div className="led-tile" style={{ borderColor: "rgba(166,226,46,0.35)" }}>
              <div className="led-tile-value led-tile-value-small" style={{ color: "#A6E22E" }}>
                📈 {climber.nickname} +{climber.delta}
              </div>
              <div className="led-tile-label">Wzlot dnia</div>
            </div>
          )}
          {faller && (
            <div className="led-tile" style={{ borderColor: "rgba(228,0,43,0.35)" }}>
              <div className="led-tile-value led-tile-value-small" style={{ color: "#FF5964" }}>
                📉 {faller.nickname} {faller.delta}
              </div>
              <div className="led-tile-label">Upadek dnia</div>
            </div>
          )}
        </div>
      )}

      {/* Podium - top 3 jako duże karty Panini */}
      {top3.length > 0 && (
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-app-subtle mb-3 text-center">🏆 PODIUM</div>
          <div className="flex justify-center gap-4 flex-wrap">
            {top3.map((r, i) => (
              <PaniniCardLarge
                key={r.userId}
                data={{
                  nickname: r.nickname,
                  avatar: r.avatar,
                  rank: i + 1,
                  totalPoints: r.stats.totalPoints,
                  exactScoreHits: r.stats.exactScoreHits,
                  avgPointsPerMatch: r.stats.avgPointsPerMatch,
                  scorerHits: r.stats.scorerHits,
                  badges: r.badges,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Reszta - mini Panini cards */}
      {rest.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-app-subtle mb-3">📋 Reszta tabeli</div>
          {rest.map((r, i) => {
            const isMe = r.userId === meId;
            return (
              <PaniniCardMini
                key={r.userId}
                href={isMe ? undefined : `/compare/${r.userId}`}
                isMe={isMe}
                data={{
                  nickname: r.nickname,
                  avatar: r.avatar,
                  rank: i + 4,
                  totalPoints: r.stats.totalPoints,
                  exactScoreHits: r.stats.exactScoreHits,
                  badges: r.badges,
                  streak: r.streak,
                }}
              />
            );
          })}
        </div>
      )}
    </>
  );
}

function Mini({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="led-tile">
      <div className={`led-tile-value ${small ? "led-tile-value-small" : ""}`}>{value}</div>
      <div className="led-tile-label">{label}</div>
    </div>
  );
}

async function PerMatchday({ md, leagueId, meId }: { md: number; leagueId: string; meId: string }) {
  const rows = await leaderboardForMatchday(md, leagueId);
  if (rows.length === 0) {
    return <div className="stat-section text-center" style={{ padding: "40px 20px", color: "rgba(255,255,255,0.6)" }}>Nikt jeszcze nie typował w tej kolejce.</div>;
  }
  return (
    <div>
      {rows.map((r, i) => {
        const isMe = r.userId === meId;
        return (
          <PaniniCardMini
            key={r.userId}
            isMe={isMe}
            data={{
              nickname: r.nickname,
              avatar: r.avatar,
              rank: i + 1,
              totalPoints: r.points,
              badges: [
                ...(r.usedBoost
                  ? [{
                      emoji: r.boostPts > 0 ? "⚡" : "💤",
                      label: r.boostPts > 0 ? `Boost trafiony (+${r.boostPts} pkt)` : "Boost użyty (0 pkt)",
                      description: r.boostPts > 0 ? "Wykorzystał boost x3 i zdobył punkty" : "Wykorzystał boost x3 ale nie zdobył punktów",
                    }]
                  : [{
                      emoji: "❌",
                      label: "Boost niewykorzystany",
                      description: "Nie użył boosta w tej kolejce - przepadnie po jej końcu",
                    }]),
              ],
              styleLabel: `${r.count} ${r.count === 1 ? "typ" : r.count < 5 ? "typy" : "typów"}`,
              styleEmoji: "🎯",
            }}
          />
        );
      })}
    </div>
  );
}

function Empty() {
  return <div className="card p-10 text-center text-app-subtle">Brak graczy w tej lidze.</div>;
}
