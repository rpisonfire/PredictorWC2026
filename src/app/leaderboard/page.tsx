import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { leaderboard, leaderboardForMatchday, leagueAggregateStats } from "@/lib/stats";

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
            label={`Kolejka ${n}`}
          />
        ))}
      </div>

      {activeMd === null
        ? <Overall leagueId={activeLeagueId} meId={me.id} />
        : <PerMatchday md={activeMd} leagueId={activeLeagueId} meId={me.id} />
      }
    </section>
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
  const [rows, agg] = await Promise.all([leaderboard(leagueId), leagueAggregateStats(leagueId)]);
  if (rows.length === 0) return <Empty />;
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-6">
        <Mini label="Graczy" value={String(agg.players)} />
        <Mini label="Średnia pkt" value={agg.avgPoints.toFixed(1)} />
        <Mini label="Najlepsza kolejka" value={agg.bestMatchday ? `${agg.bestMatchday.points} (${agg.bestMatchday.nickname})` : "-"} small />
      </div>

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
    <div className="card p-3">
      <div className="text-[10px] uppercase tracking-wider text-app-subtle">{label}</div>
      <div className={`font-black ${small ? "text-sm" : "text-xl"} truncate`}>{value}</div>
    </div>
  );
}

async function PerMatchday({ md, leagueId, meId }: { md: number; leagueId: string; meId: string }) {
  const rows = await leaderboardForMatchday(md, leagueId);
  if (rows.length === 0) {
    return <div className="card p-10 text-center text-app-subtle">Nikt jeszcze nie typował w tej kolejce.</div>;
  }
  return (
    <div className="card overflow-hidden">
      {rows.map((r, i) => {
        const medal = ["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`;
        const isMe = r.userId === meId;
        return (
          <div
            key={r.userId}
            className={`flex items-center justify-between px-5 py-3 border-b border-app last:border-0 ${isMe ? "bg-wc-red/5" : ""}`}
          >
            <div className="flex items-center gap-3">
              <span className="w-8 text-center font-black text-lg">{medal}</span>
              <span className="text-2xl">{r.avatar}</span>
              <div>
                <div className="font-bold">{r.nickname} {isMe && <span className="text-xs text-wc-red">(ty)</span>}</div>
                <div className="text-xs text-app-subtle">{r.count} typów</div>
              </div>
            </div>
            <div className="text-2xl font-black">{r.points} <span className="text-sm text-app-subtle">pkt</span></div>
          </div>
        );
      })}
    </div>
  );
}

function Empty() {
  return <div className="card p-10 text-center text-app-subtle">Brak graczy w tej lidze.</div>;
}
