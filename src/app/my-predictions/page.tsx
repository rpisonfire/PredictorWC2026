import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { PlayerAvatar } from "@/components/PlayerAvatar";

// Cache 5 min - typy zmieniają się rzadko, revalidate po zapisie usera + po wpisaniu wyniku.
export const revalidate = 300;
import { Sparkline } from "@/components/Sparkline";
import { fmtDateTime } from "@/lib/dates";
import { Flag } from "@/components/Flag";

export default async function MyPredictions() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const predictions = await prisma.prediction.findMany({
    where: { userId: user.id },
    include: {
      match: { include: { homeTeam: true, awayTeam: true } },
      player: true,
    },
    orderBy: { match: { kickoff: "asc" } },
  });

  const boosts = await prisma.boost.findMany({ where: { userId: user.id } });
  const boostMatchIds = new Set(boosts.map((b) => b.matchId));

  let total = 0;
  for (const p of predictions) {
    total += boostMatchIds.has(p.matchId) ? p.pointsAwarded * 3 : p.pointsAwarded;
  }

  const finished = predictions.filter((p) => p.match.homeScore !== null);
  const upcoming = predictions.filter((p) => p.match.homeScore === null);

  const sparkPoints = finished.map((p) => boostMatchIds.has(p.matchId) ? p.pointsAwarded * 3 : p.pointsAwarded);
  const sparkLabels = finished.map((p) => {
    const pts = boostMatchIds.has(p.matchId) ? p.pointsAwarded * 3 : p.pointsAwarded;
    const m = p.match;
    const boost = boostMatchIds.has(p.matchId) ? " ⚡" : "";
    return `${m.homeTeam.shortCode} ${m.homeScore}:${m.awayScore} ${m.awayTeam.shortCode} → ${pts} pkt${boost}`;
  });

  // Grupowanie rozegranych po kolejce - desc (najnowsza najpierw, otwarta domyślnie)
  const finishedByMd = new Map<number, typeof finished>();
  for (const p of finished) {
    const arr = finishedByMd.get(p.match.matchday) ?? [];
    arr.push(p);
    finishedByMd.set(p.match.matchday, arr);
  }
  const finishedMatchdays = Array.from(finishedByMd.keys()).sort((a, b) => b - a);
  const newestMd = finishedMatchdays[0];

  return (
    <section className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black">Moje typy</h1>
          <p className="text-app-muted">{predictions.length} typów łącznie</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-black text-wc-gold">{total}</div>
          <div className="text-xs text-app-subtle uppercase tracking-wider">punktów</div>
        </div>
      </div>

      {sparkPoints.length >= 2 && (
        <div className="card p-4 mb-6">
          <div className="text-xs uppercase tracking-wider text-app-subtle mb-1">Twoja forma (pkt/mecz)</div>
          <Sparkline points={sparkPoints} labels={sparkLabels} />
        </div>
      )}

      {predictions.length === 0 && (
        <div className="card p-10 text-center">
          <div className="text-5xl mb-3">⚽</div>
          <div className="font-bold">Brak typów</div>
          <p className="text-sm text-app-subtle mt-1">Wejdź na <Link href="/dashboard" className="text-wc-red font-bold">listę meczów</Link> i zacznij typować.</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <>
          <h2 className="text-sm uppercase tracking-wider text-app-subtle mb-2 mt-2">Nadchodzące</h2>
          <div className="space-y-2 mb-6">
            {upcoming.map((p) => <Row key={p.id} p={p} boosted={boostMatchIds.has(p.matchId)} />)}
          </div>
        </>
      )}

      {finished.length > 0 && (
        <>
          <h2 className="text-sm uppercase tracking-wider text-app-subtle mb-2">Rozegrane</h2>
          {finishedMatchdays.map((md) => {
            const list = finishedByMd.get(md)!;
            const isNewest = md === newestMd;
            const sumPts = list.reduce(
              (s, p) => s + (boostMatchIds.has(p.matchId) ? p.pointsAwarded * 3 : p.pointsAwarded),
              0,
            );
            return (
              <details key={md} open={isNewest} className="mb-3">
                <summary className="collapse-header">
                  <span className="flex items-center gap-2">
                    <span className="collapse-chev">▶</span>
                    Kolejka {md}
                    <span className="collapse-count">· {list.length} {list.length === 1 ? "mecz" : "meczy"}</span>
                  </span>
                  <span className={`chip-pts ${sumPts > 0 ? "" : "zero"}`}>
                    {sumPts > 0 ? `+${sumPts}` : "0"} pkt
                  </span>
                </summary>
                <div className="grid sm:grid-cols-2 gap-2 mt-3">
                  {list.map((p) => <Row key={p.id} p={p} boosted={boostMatchIds.has(p.matchId)} resolved />)}
                </div>
              </details>
            );
          })}
        </>
      )}
    </section>
  );
}

function Row({ p, boosted, resolved }: { p: any; boosted: boolean; resolved?: boolean }) {
  const m = p.match;
  const pts = boosted ? p.pointsAwarded * 3 : p.pointsAwarded;
  // Scorer hit/miss - tylko gdy mecz rozegrany i user wybrał strzelca
  const scorerHit = resolved && p.player && m.firstGoalPlayerId && p.firstGoalPlayerId === m.firstGoalPlayerId;
  const scorerMiss = resolved && p.player && p.firstGoalPlayerId !== m.firstGoalPlayerId;
  const scorerChipClass = scorerHit
    ? "bg-wc-green/10 border border-wc-green/50 text-wc-green"
    : scorerMiss
    ? "bg-wc-red/10 border border-wc-red/40 text-wc-red"
    : "bg-app-hover";
  return (
    <Link href={`/match/${m.id}`} className="card p-4 block hover:border-wc-red/40 transition">
      <div className="flex items-center justify-between text-xs text-app-subtle mb-2">
        <span>{m.stage} · Kolejka {m.matchday}</span>
        <span>{fmtDateTime(m.kickoff)}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <Flag emoji={m.homeTeam.flag} size="sm" alt={m.homeTeam.name} />
          <span className="font-bold">{m.homeTeam.shortCode}</span>
        </div>
        <div className="text-center px-3">
          <div className="text-xl font-black">{p.homeScore} : {p.awayScore}</div>
          {resolved && (
            <div className="text-xs font-black text-wc-gold">wynik: {m.homeScore} : {m.awayScore}</div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="font-bold">{m.awayTeam.shortCode}</span>
          <Flag emoji={m.awayTeam.flag} size="sm" alt={m.awayTeam.name} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {p.player && (
            <div className={`flex items-center gap-1.5 chip ${scorerChipClass}`}>
              <PlayerAvatar name={p.player.name} photoUrl={p.player.photoUrl} size={20} />
              <span>{p.player.name}</span>
              {scorerHit && <span>✓</span>}
              {scorerMiss && <span>✗</span>}
            </div>
          )}
          {boosted && <span className="chip bg-wc-gold/15 text-wc-gold">x3 ⚡</span>}
        </div>
        {resolved && (
          <div className={`font-black ${pts > 0 ? "text-wc-green" : "text-app-subtle"}`}>
            {pts > 0 ? `+${pts}` : "0"} pkt
          </div>
        )}
      </div>
    </Link>
  );
}
