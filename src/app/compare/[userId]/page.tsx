import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Emoji } from "@/components/Emoji";
import { Flag } from "@/components/Flag";
import { fmtDateTime } from "@/lib/dates";

export const revalidate = 300;

export default async function CompareWithRival({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (userId === me.id) redirect("/compare");

  const rival = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, nickname: true, avatar: true },
  });
  if (!rival) notFound();

  // Wszystkie rozegrane mecze z predykcjami obu graczy + boostami
  const [matches, myBoosts, rivalBoosts] = await Promise.all([
    prisma.match.findMany({
      where: { homeScore: { not: null } },
      include: {
        homeTeam: true,
        awayTeam: true,
        predictions: {
          where: { userId: { in: [me.id, rival.id] } },
        },
      },
      orderBy: { kickoff: "desc" },
    }),
    prisma.boost.findMany({ where: { userId: me.id }, select: { matchId: true } }),
    prisma.boost.findMany({ where: { userId: rival.id }, select: { matchId: true } }),
  ]);

  const myBoostSet = new Set(myBoosts.map((b) => b.matchId));
  const rivalBoostSet = new Set(rivalBoosts.map((b) => b.matchId));

  let myTotal = 0;
  let rivalTotal = 0;
  let myWins = 0;
  let rivalWins = 0;
  let draws = 0;

  const rows = matches.map((m) => {
    const myPred = m.predictions.find((p) => p.userId === me.id);
    const rivalPred = m.predictions.find((p) => p.userId === rival.id);
    const myBoost = myBoostSet.has(m.id);
    const rivalBoost = rivalBoostSet.has(m.id);
    const myPts = myPred ? (myBoost ? myPred.pointsAwarded * 3 : myPred.pointsAwarded) : 0;
    const rivalPts = rivalPred ? (rivalBoost ? rivalPred.pointsAwarded * 3 : rivalPred.pointsAwarded) : 0;
    myTotal += myPts;
    rivalTotal += rivalPts;
    if (myPts > rivalPts) myWins++;
    else if (rivalPts > myPts) rivalWins++;
    else draws++;
    return { m, myPred, rivalPred, myPts, rivalPts, myBoost, rivalBoost };
  });

  return (
    <section className="max-w-3xl mx-auto">
      <Link href="/compare" className="text-sm text-app-subtle hover:text-app">← Lista pojedynków</Link>

      {/* Score header */}
      <div className="card p-5 mt-3 mb-4">
        <div className="flex items-center justify-around gap-3 text-center">
          <div className="flex-1 min-w-0">
            <Emoji char={me.avatar} size="2xl" alt={me.nickname} />
            <div className="font-black truncate mt-1">{me.nickname}</div>
            <div className="text-[10px] text-app-subtle uppercase tracking-wider">ty</div>
          </div>
          <div className="text-center shrink-0 px-2">
            <div className="text-3xl font-black tabular-nums">
              <span className={myTotal >= rivalTotal ? "text-wc-green" : "text-app-subtle"}>{myTotal}</span>
              <span className="text-app-subtle mx-1">:</span>
              <span className={rivalTotal > myTotal ? "text-wc-green" : "text-app-subtle"}>{rivalTotal}</span>
            </div>
            <div className="text-[10px] text-app-subtle uppercase tracking-wider">pkt łącznie</div>
          </div>
          <div className="flex-1 min-w-0">
            <Emoji char={rival.avatar} size="2xl" alt={rival.nickname} />
            <div className="font-black truncate mt-1">{rival.nickname}</div>
            <div className="text-[10px] text-app-subtle uppercase tracking-wider">rywal</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
          <div className="card p-2 bg-wc-green/10 border-wc-green/20">
            <div className="text-lg font-black text-wc-green tabular-nums">{myWins}</div>
            <div className="text-app-subtle">wygrane mecze</div>
          </div>
          <div className="card p-2">
            <div className="text-lg font-black text-app-subtle tabular-nums">{draws}</div>
            <div className="text-app-subtle">remisy</div>
          </div>
          <div className="card p-2 bg-wc-red/5 border-wc-red/20">
            <div className="text-lg font-black text-wc-red tabular-nums">{rivalWins}</div>
            <div className="text-app-subtle">{rival.nickname} lepsze</div>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-2">⏳</div>
          <div className="font-bold">Brak rozegranych meczów</div>
          <p className="text-sm text-app-subtle mt-1">Pojedynek zacznie się po pierwszym wyniku.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(({ m, myPred, rivalPred, myPts, rivalPts, myBoost, rivalBoost }) => (
            <Link
              key={m.id}
              href={`/match/${m.id}`}
              className="card p-3 block hover:border-wc-red/40 transition"
            >
              <div className="flex items-center justify-between text-[10px] text-app-subtle mb-1.5">
                <span>{m.stage} · Kolejka {m.matchday}</span>
                <span>{fmtDateTime(m.kickoff)}</span>
              </div>
              <div className="flex items-center justify-center gap-2 font-black text-sm mb-2">
                <Flag emoji={m.homeTeam.flag} size="sm" />
                <span>{m.homeTeam.shortCode}</span>
                <span className="text-wc-gold tabular-nums">{m.homeScore}:{m.awayScore}</span>
                <span>{m.awayTeam.shortCode}</span>
                <Flag emoji={m.awayTeam.flag} size="sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className={`rounded-lg p-2 text-center ${myPts > rivalPts ? "bg-wc-green/10 border border-wc-green/30" : "bg-app-hover"}`}>
                  <div className="text-[10px] uppercase tracking-wider text-app-subtle">Ty</div>
                  <div className="font-black tabular-nums">
                    {myPred ? `${myPred.homeScore}:${myPred.awayScore}` : "—"}
                    {myBoost && <span className="ml-1 text-wc-gold">⚡</span>}
                  </div>
                  <div className={`text-xs font-black ${myPts > 0 ? "text-wc-green" : "text-app-subtle"}`}>
                    {myPts > 0 ? `+${myPts}` : "0"} pkt
                  </div>
                </div>
                <div className={`rounded-lg p-2 text-center ${rivalPts > myPts ? "bg-wc-green/10 border border-wc-green/30" : "bg-app-hover"}`}>
                  <div className="text-[10px] uppercase tracking-wider text-app-subtle truncate">{rival.nickname}</div>
                  <div className="font-black tabular-nums">
                    {rivalPred ? `${rivalPred.homeScore}:${rivalPred.awayScore}` : "—"}
                    {rivalBoost && <span className="ml-1 text-wc-gold">⚡</span>}
                  </div>
                  <div className={`text-xs font-black ${rivalPts > 0 ? "text-wc-green" : "text-app-subtle"}`}>
                    {rivalPts > 0 ? `+${rivalPts}` : "0"} pkt
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
