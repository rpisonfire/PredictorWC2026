import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Emoji } from "@/components/Emoji";
import { Flag } from "@/components/Flag";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { singleUserStyle, statsForUser } from "@/lib/stats";
import { matchdayLabel } from "@/lib/stageLabel";
import { WrappedShareButton } from "@/components/WrappedShareButton";

export const revalidate = 3600;

const sign = (a: number, b: number) => (a > b ? 1 : a < b ? -1 : 0);

export default async function WrappedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Lock: tylko po finale. Admin ma podgląd wcześniej.
  const lastMatch = await prisma.match.findFirst({
    where: { stage: "Finał" },
    select: { homeScore: true, kickoff: true },
  });
  const finalPlayed = lastMatch && lastMatch.homeScore !== null;

  if (!finalPlayed && !user.isAdmin) {
    const daysToFinal = lastMatch
      ? Math.max(0, Math.ceil((lastMatch.kickoff.getTime() - Date.now()) / (24 * 3600 * 1000)))
      : null;
    return (
      <section className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black mb-1">Wrapped 🎁</h1>
        <p className="text-app-muted mb-6">Twoje podsumowanie mundialu.</p>
        <div className="card p-10 text-center">
          <div className="text-6xl mb-3">🔒</div>
          <div className="font-black text-xl">Jeszcze nie dostępne</div>
          <p className="text-sm text-app-muted mt-2">
            Wrapped odblokuje się po finale Mistrzostw Świata 2026.
          </p>
          {daysToFinal !== null && daysToFinal > 0 && (
            <p className="text-sm text-app-subtle mt-2">
              Zostało <b className="text-wc-gold">{daysToFinal}</b> {daysToFinal === 1 ? "dzień" : "dni"} do finału.
            </p>
          )}
          <Link href="/dashboard" className="btn-ghost mt-4 inline-flex">← Wróć do meczów</Link>
        </div>
      </section>
    );
  }

  // ===== Agregacje =====
  const [stats, style, preds, ranking, allPreds] = await Promise.all([
    statsForUser(user.id),
    singleUserStyle(user.id),
    prisma.prediction.findMany({
      where: { userId: user.id },
      include: {
        match: { include: { homeTeam: true, awayTeam: true } },
        player: { include: { team: { select: { flag: true } } } },
      },
    }),
    prisma.user.findUnique({ where: { id: user.id }, select: { currentRank: true } }),
    prisma.prediction.findMany({
      where: { userId: { not: user.id } },
      select: { matchId: true, userId: true, pointsAwarded: true, homeScore: true, awayScore: true },
    }),
  ]);

  const myBoosts = await prisma.boost.findMany({ where: { userId: user.id } });
  const boostSet = new Set(myBoosts.map((b) => b.matchId));
  const finishedPreds = preds.filter((p) => p.match.homeScore !== null);
  const ptsOf = (p: (typeof preds)[number]) =>
    boostSet.has(p.matchId) ? p.pointsAwarded * 3 : p.pointsAwarded;

  // 🌟 Najlepszy pojedynczy mecz
  let best: { pts: number; pred: (typeof preds)[number] } | null = null;
  for (const p of finishedPreds) {
    const pts = ptsOf(p);
    if (!best || pts > best.pts) best = { pts, pred: p };
  }

  // 🦄 Rzadki strzał - trafiony dokładny wynik, który obstawiło najmniej graczy
  let rarest: { pred: (typeof preds)[number]; others: number } | null = null;
  for (const p of finishedPreds) {
    const exact = p.homeScore === p.match.homeScore && p.awayScore === p.match.awayScore;
    if (!exact) continue;
    const othersSame = allPreds.filter(
      (op) => op.matchId === p.matchId && op.homeScore === p.homeScore && op.awayScore === p.awayScore,
    ).length;
    if (!rarest || othersSame < rarest.others) rarest = { pred: p, others: othersSame };
  }

  // ✅ Trafieni zwycięzcy - mecze gdzie typ miał dobry rezultat (min. tier +2)
  const winnersHit = finishedPreds.filter(
    (p) => sign(p.homeScore, p.awayScore) === sign(p.match.homeScore!, p.match.awayScore!),
  ).length;

  // ⚽ Najczęściej stawiany strzelec
  const scorerCount = new Map<string, { name: string; photoUrl: string | null; position: string | null; flag: string; n: number }>();
  for (const p of preds) {
    if (!p.player) continue;
    const e = scorerCount.get(p.player.id) ?? {
      name: p.player.name,
      photoUrl: p.player.photoUrl,
      position: p.player.position,
      flag: p.player.team?.flag ?? "🏳️",
      n: 0,
    };
    e.n += 1;
    scorerCount.set(p.player.id, e);
  }
  const topScorer = Array.from(scorerCount.values()).sort((a, b) => b.n - a.n)[0];

  // 💰 / 🕳️ Drużyny: która przyniosła najwięcej, a która najmniej punktów
  // Punkty z meczu przypisujemy obu drużynom w nim grającym.
  const teamPts = new Map<string, { name: string; flag: string; pts: number; n: number }>();
  for (const p of finishedPreds) {
    const pts = ptsOf(p);
    for (const t of [p.match.homeTeam, p.match.awayTeam]) {
      const e = teamPts.get(t.id) ?? { name: t.name, flag: t.flag, pts: 0, n: 0 };
      e.pts += pts;
      e.n += 1;
      teamPts.set(t.id, e);
    }
  }
  const teamsArr = Array.from(teamPts.values());
  const goldMine = [...teamsArr].sort((a, b) => b.pts - a.pts)[0];
  const moneyPit = [...teamsArr].filter((t) => t.n >= 3).sort((a, b) => a.pts - b.pts)[0];

  // 🥅 Gole: przewidziane vs faktyczne
  let predictedGoals = 0;
  let actualGoals = 0;
  for (const p of finishedPreds) {
    predictedGoals += p.homeScore + p.awayScore;
    actualGoals += p.match.homeScore! + p.match.awayScore!;
  }

  // 📅 Najlepsza kolejka
  const mdPts = new Map<number, number>();
  for (const p of finishedPreds) {
    mdPts.set(p.match.matchday, (mdPts.get(p.match.matchday) ?? 0) + ptsOf(p));
  }
  const bestMd = Array.from(mdPts.entries()).sort((a, b) => b[1] - a[1])[0];

  // ⚔️ Najczęściej pokonywany rywal
  const matchupWins = new Map<string, number>();
  for (const p of finishedPreds) {
    const myPts = ptsOf(p);
    for (const op of allPreds) {
      if (op.matchId !== p.matchId) continue;
      if (myPts > op.pointsAwarded) matchupWins.set(op.userId, (matchupWins.get(op.userId) ?? 0) + 1);
    }
  }
  const topBeatenEntry = Array.from(matchupWins.entries()).sort((a, b) => b[1] - a[1])[0];
  const topBeatenUser = topBeatenEntry
    ? await prisma.user.findUnique({ where: { id: topBeatenEntry[0] }, select: { nickname: true, avatar: true } })
    : null;

  return (
    <section className="max-w-2xl mx-auto">
      {!finalPlayed && (
        <div
          className="mb-4 rounded-xl px-4 py-2.5 text-center text-xs font-black uppercase tracking-widest"
          style={{
            background: "linear-gradient(180deg, #0a0e1a 0%, #050810 100%)",
            border: "1px solid rgba(241,180,52,0.5)",
            color: "#F1B434",
            fontFamily: "'Courier New', monospace",
            textShadow: "0 0 8px rgba(241,180,52,0.4)",
          }}
        >
          🛠️ Podgląd admina · dla graczy odblokuje się po finale
        </div>
      )}

      {/* Wszystko w #wrapped-card - to renderuje się do PNG */}
      <div id="wrapped-card" className="space-y-4 p-4 -m-4" style={{ background: "#0B0F19" }}>
        <div className="text-center mb-2">
          <div className="text-5xl mb-2">🎁</div>
          <h1
            className="text-4xl font-black"
            style={{
              background: "linear-gradient(90deg, #AA151B, #F1BF00, #AA151B)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Twój Wrapped 2026
          </h1>
          <p className="text-app-muted mt-1">
            <Emoji char={user.avatar} size="sm" alt="" /> <b className="text-white">{user.nickname}</b> · Mundial 2026 🇪🇸
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card emoji="📊" title="Punktów łącznie" value={stats.totalPoints} />
          <Card emoji="🏅" title="Miejsce w rankingu" value={ranking?.currentRank ? `${ranking.currentRank}.` : "—"} />
          <Card emoji="🎯" title="Dokładne wyniki" value={stats.exactScoreHits} />
          <Card emoji="✅" title="Trafieni zwycięzcy" value={`${winnersHit}/${finishedPreds.length}`} />
          <Card emoji="🥅" title="Gole wytypowane" value={`${predictedGoals} (padło ${actualGoals})`} small />
          <Card emoji="⚡" title="Najdłuższa seria 5+" value={stats.longestStreak} />
        </div>

        {rarest && (
          <div className="card p-5" style={{ borderColor: "rgba(241,191,0,0.45)" }}>
            <div className="text-xs uppercase tracking-wider text-app-subtle mb-2">🦄 Rzadki strzał</div>
            <div className="flex items-center gap-2 font-black text-lg flex-wrap">
              <Flag emoji={rarest.pred.match.homeTeam.flag} size="sm" />
              <span>{rarest.pred.match.homeTeam.shortCode}</span>
              <span className="text-wc-gold tabular-nums">{rarest.pred.homeScore}:{rarest.pred.awayScore}</span>
              <span>{rarest.pred.match.awayTeam.shortCode}</span>
              <Flag emoji={rarest.pred.match.awayTeam.flag} size="sm" />
            </div>
            <div className="text-sm text-app-muted mt-1">
              Trafiłeś dokładny wynik, który poza Tobą obstawiło tylko{" "}
              <b className="text-wc-gold">{rarest.others}</b> {rarest.others === 1 ? "gracz" : "graczy"}.
              {rarest.others === 0 && " Samotny wilk. 🐺"}
            </div>
          </div>
        )}

        {best && (
          <div className="card p-5 border-wc-gold/40">
            <div className="text-xs uppercase tracking-wider text-app-subtle mb-2">🌟 Twój najlepszy mecz</div>
            <div className="flex items-center gap-2 font-black text-lg flex-wrap">
              <Flag emoji={best.pred.match.homeTeam.flag} size="sm" />
              <span>{best.pred.match.homeTeam.shortCode}</span>
              <span className="text-wc-gold tabular-nums">{best.pred.match.homeScore}:{best.pred.match.awayScore}</span>
              <span>{best.pred.match.awayTeam.shortCode}</span>
              <Flag emoji={best.pred.match.awayTeam.flag} size="sm" />
            </div>
            <div className="text-sm text-app-muted mt-1">
              Twój typ: <b>{best.pred.homeScore}:{best.pred.awayScore}</b> ·{" "}
              <span className="text-wc-gold font-black">+{best.pts} pkt</span>
              {bestMd && <> · najlepsza kolejka: <b>{matchdayLabel(bestMd[0])}</b> (+{bestMd[1]} pkt)</>}
            </div>
          </div>
        )}

        {topScorer && (
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wider text-app-subtle mb-2">⚽ Twój ulubiony strzelec</div>
            <div className="flex items-center gap-3">
              <PlayerAvatar name={topScorer.name} photoUrl={topScorer.photoUrl} position={topScorer.position} size={44} />
              <div>
                <div className="font-black text-lg flex items-center gap-2">
                  {topScorer.name} <Flag emoji={topScorer.flag} size="sm" />
                </div>
                <div className="text-sm text-app-muted">
                  Stawiałeś na niego <b className="text-wc-gold">{topScorer.n}×</b> jako pierwszego strzelca
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {goldMine && (
            <div className="card p-5">
              <div className="text-xs uppercase tracking-wider text-app-subtle mb-2">💰 Żyła złota</div>
              <div className="flex items-center gap-2 font-black">
                <Flag emoji={goldMine.flag} size="md" />
                <span>{goldMine.name}</span>
              </div>
              <div className="text-sm text-app-muted mt-1">
                Mecze z nią dały Ci <b className="text-wc-green">{goldMine.pts} pkt</b> ({goldMine.n} meczy)
              </div>
            </div>
          )}
          {moneyPit && moneyPit.name !== goldMine?.name && (
            <div className="card p-5">
              <div className="text-xs uppercase tracking-wider text-app-subtle mb-2">🕳️ Studnia bez dna</div>
              <div className="flex items-center gap-2 font-black">
                <Flag emoji={moneyPit.flag} size="md" />
                <span>{moneyPit.name}</span>
              </div>
              <div className="text-sm text-app-muted mt-1">
                Tylko <b className="text-wc-red">{moneyPit.pts} pkt</b> z {moneyPit.n} meczy. Nie było chemii.
              </div>
            </div>
          )}
        </div>

        {style && (
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wider text-app-subtle mb-2">🎨 Twój styl typowania</div>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{style.style.emoji}</span>
              <div>
                <div className="font-black text-lg">{style.style.label}</div>
                <div className="text-sm text-app-muted">{style.style.desc}</div>
              </div>
            </div>
          </div>
        )}

        {topBeatenUser && (
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wider text-app-subtle mb-2">⚔️ Pokonałeś najczęściej</div>
            <div className="flex items-center gap-3">
              <Emoji char={topBeatenUser.avatar} size="2xl" alt={topBeatenUser.nickname} />
              <div>
                <div className="font-black text-lg">{topBeatenUser.nickname}</div>
                <div className="text-sm text-app-muted">
                  W <b className="text-wc-green">{topBeatenEntry![1]}</b> meczach miałeś więcej punktów
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          className="card p-6 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(170,21,27,0.2), rgba(241,191,0,0.12), rgba(170,21,27,0.2))",
            borderColor: "rgba(241,191,0,0.45)",
          }}
        >
          <div className="text-2xl mb-2">🇪🇸🏆</div>
          <div className="font-black" style={{ color: "#F1BF00" }}>¡España campeona del mundo!</div>
          <p className="text-sm text-app-muted mt-1">
            Mundial 2026 to było coś. Dzięki za grę - do zobaczenia za 4 lata! ⚽
          </p>
          <p className="text-[10px] text-app-subtle mt-2" style={{ fontFamily: "'Courier New', monospace", letterSpacing: "1px" }}>
            WC PREDICTOR 2026
          </p>
        </div>
      </div>

      <div className="mt-5">
        <WrappedShareButton nickname={user.nickname} />
      </div>
    </section>
  );
}

function Card({ emoji, title, value, small }: { emoji: string; title: string; value: React.ReactNode; small?: boolean }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-[10px] uppercase tracking-wider text-app-subtle">{title}</div>
      <div className={`font-black mt-1 tabular-nums ${small ? "text-lg" : "text-2xl"}`}>{value}</div>
    </div>
  );
}
