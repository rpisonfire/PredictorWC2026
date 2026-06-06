import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { leaderboard, leaderboardForMatchday } from "@/lib/stats";

export default async function Leaderboard({
  searchParams,
}: { searchParams: Promise<{ md?: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const { md } = await searchParams;
  const matchdays = await prisma.match.findMany({
    select: { matchday: true },
    distinct: ["matchday"],
    orderBy: { matchday: "asc" },
  });
  const mds = matchdays.map((m) => m.matchday);
  const activeMd = md ? Number(md) : null;

  return (
    <section className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-black mb-1">Tabela 🏆</h1>
      <p className="text-white/60 mb-4">Kto rządzi w lidze.</p>

      <div className="flex gap-2 mb-5 overflow-x-auto -mx-1 px-1">
        <Tab href="/leaderboard" active={activeMd === null} label="Ogólna" />
        {mds.map((n) => (
          <Tab key={n} href={`/leaderboard?md=${n}`} active={activeMd === n} label={`Kolejka ${n}`} />
        ))}
      </div>

      {activeMd === null ? <Overall meId={me.id} /> : <PerMatchday md={activeMd} meId={me.id} />}
    </section>
  );
}

function Tab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-bold ${active ? "bg-wc-red text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
    >
      {label}
    </Link>
  );
}

async function Overall({ meId }: { meId: string }) {
  const rows = await leaderboard();
  return (
    <div className="card overflow-hidden">
      {rows.map((r, i) => {
        const medal = ["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`;
        const isMe = r.userId === meId;
        return (
          <div
            key={r.userId}
            className={`flex items-center justify-between px-5 py-3 border-b border-white/5 last:border-0 ${isMe ? "bg-wc-red/5" : ""}`}
          >
            <div className="flex items-center gap-3">
              <span className="w-8 text-center font-black text-lg">{medal}</span>
              <span className="text-2xl">{r.avatar}</span>
              <div>
                <div className="font-bold flex items-center gap-2 flex-wrap">
                  {r.nickname} {isMe && <span className="text-xs text-wc-red">(ty)</span>}
                  {r.badges.map((b) => (
                    <span key={b.key} title={`${b.label} — ${b.description}`} className="text-base">{b.emoji}</span>
                  ))}
                </div>
                <div className="text-xs text-white/40">
                  {r.stats.finishedCount} rozegranych · celność {r.stats.accuracy.toFixed(0)}%
                </div>
              </div>
            </div>
            <div className="text-2xl font-black">{r.stats.totalPoints} <span className="text-sm text-white/40">pkt</span></div>
          </div>
        );
      })}
    </div>
  );
}

async function PerMatchday({ md, meId }: { md: number; meId: string }) {
  const rows = await leaderboardForMatchday(md);
  if (rows.length === 0) {
    return <div className="card p-10 text-center text-white/50">Nikt jeszcze nie typował w tej kolejce.</div>;
  }
  return (
    <div className="card overflow-hidden">
      {rows.map((r, i) => {
        const medal = ["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`;
        const isMe = r.userId === meId;
        return (
          <div
            key={r.userId}
            className={`flex items-center justify-between px-5 py-3 border-b border-white/5 last:border-0 ${isMe ? "bg-wc-red/5" : ""}`}
          >
            <div className="flex items-center gap-3">
              <span className="w-8 text-center font-black text-lg">{medal}</span>
              <span className="text-2xl">{r.avatar}</span>
              <div>
                <div className="font-bold">{r.nickname} {isMe && <span className="text-xs text-wc-red">(ty)</span>}</div>
                <div className="text-xs text-white/40">{r.count} typów</div>
              </div>
            </div>
            <div className="text-2xl font-black">{r.points} <span className="text-sm text-white/40">pkt</span></div>
          </div>
        );
      })}
    </div>
  );
}
