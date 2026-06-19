import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Emoji } from "@/components/Emoji";
import { Flag } from "@/components/Flag";
import { singleUserStyle, statsForUser } from "@/lib/stats";

export const revalidate = 3600;

export default async function WrappedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Lock: tylko po finale (ostatni mecz mundialu rozegrany)
  const lastMatch = await prisma.match.findFirst({
    where: { stage: "Finał" },
    select: { homeScore: true, kickoff: true },
  });
  const finalPlayed = lastMatch && lastMatch.homeScore !== null;

  if (!finalPlayed) {
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

  // Wrapped - agregacje
  const [stats, style, preds, ranking, allPreds] = await Promise.all([
    statsForUser(user.id),
    singleUserStyle(user.id),
    prisma.prediction.findMany({
      where: { userId: user.id },
      include: { match: { include: { homeTeam: true, awayTeam: true } }, player: true },
    }),
    prisma.user.findUnique({ where: { id: user.id }, select: { currentRank: true } }),
    prisma.prediction.findMany({
      where: { userId: { not: user.id } },
      select: { matchId: true, userId: true, pointsAwarded: true },
    }),
  ]);

  const myBoosts = await prisma.boost.findMany({ where: { userId: user.id } });
  const boostSet = new Set(myBoosts.map((b) => b.matchId));

  // Najlepszy pojedynczy mecz
  let best: { pts: number; pred: typeof preds[number] } | null = null;
  for (const p of preds) {
    if (p.match.homeScore == null) continue;
    const boosted = boostSet.has(p.matchId);
    const pts = boosted ? p.pointsAwarded * 3 : p.pointsAwarded;
    if (!best || pts > best.pts) best = { pts, pred: p };
  }

  // Najczęściej obstawiana drużyna (jako home lub away)
  const teamCount = new Map<string, { name: string; flag: string; n: number }>();
  for (const p of preds) {
    [p.match.homeTeam, p.match.awayTeam].forEach((t) => {
      const e = teamCount.get(t.id) ?? { name: t.name, flag: t.flag, n: 0 };
      e.n += 1;
      teamCount.set(t.id, e);
    });
  }
  const topTeam = Array.from(teamCount.values()).sort((a, b) => b.n - a.n)[0];

  // Najczęstszy rywal (mecz po meczu, kto był wyżej)
  const matchupWins = new Map<string, { user: string; wins: number }>();
  for (const p of preds) {
    if (p.match.homeScore == null) continue;
    const myPts = (boostSet.has(p.matchId) ? p.pointsAwarded * 3 : p.pointsAwarded);
    const others = allPreds.filter((op) => op.matchId === p.matchId);
    for (const op of others) {
      const opPts = op.pointsAwarded; // bez boost - rough porównanie
      if (myPts > opPts) {
        const e = matchupWins.get(op.userId) ?? { user: op.userId, wins: 0 };
        e.wins += 1;
        matchupWins.set(op.userId, e);
      }
    }
  }
  const topBeaten = Array.from(matchupWins.values()).sort((a, b) => b.wins - a.wins)[0];
  const topBeatenUser = topBeaten ? await prisma.user.findUnique({
    where: { id: topBeaten.user },
    select: { nickname: true, avatar: true },
  }) : null;

  return (
    <section className="max-w-2xl mx-auto space-y-4">
      <div className="text-center mb-2">
        <div className="text-5xl mb-2">🎁</div>
        <h1 className="text-4xl font-black bg-gradient-to-r from-wc-red via-wc-gold to-wc-green bg-clip-text text-transparent">
          Twój Wrapped 2026
        </h1>
        <p className="text-app-muted mt-1">Zobacz jak Ci poszło na Mundialu</p>
      </div>

      <Card emoji="📊" title="Łącznie zdobytych punktów" value={stats.totalPoints} />
      <Card emoji="🏅" title="Końcowa pozycja w rankingu" value={ranking?.currentRank ? `${ranking.currentRank}.` : "—"} />
      <Card emoji="🎯" title="Trafione dokładne wyniki" value={stats.exactScoreHits} />
      <Card emoji="⚡" title="Twoja najdłuższa seria 5+ pkt" value={stats.longestStreak} />

      {best && (
        <div className="card p-5 border-wc-gold/40 bg-wc-gold/5">
          <div className="text-xs uppercase tracking-wider text-app-subtle mb-2">🌟 Twój najlepszy mecz</div>
          <div className="flex items-center gap-2 font-black text-lg">
            <Flag emoji={best.pred.match.homeTeam.flag} size="sm" />
            <span>{best.pred.match.homeTeam.shortCode}</span>
            <span className="text-wc-gold tabular-nums">{best.pred.match.homeScore}:{best.pred.match.awayScore}</span>
            <span>{best.pred.match.awayTeam.shortCode}</span>
            <Flag emoji={best.pred.match.awayTeam.flag} size="sm" />
          </div>
          <div className="text-sm text-app-muted mt-1">
            Twój typ: <b>{best.pred.homeScore}:{best.pred.awayScore}</b> · <span className="text-wc-gold font-black">+{best.pts} pkt</span>
          </div>
        </div>
      )}

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

      {topTeam && (
        <Card
          emoji="❤️"
          title="Twoja drużyna turnieju"
          value={
            <span className="flex items-center gap-2 justify-center">
              <Flag emoji={topTeam.flag} size="md" />
              <span>{topTeam.name}</span>
              <span className="text-app-subtle text-xs ml-1">({topTeam.n}×)</span>
            </span>
          }
        />
      )}

      {topBeatenUser && (
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider text-app-subtle mb-2">⚔️ Pokonałeś najczęściej</div>
          <div className="flex items-center gap-3">
            <Emoji char={topBeatenUser.avatar} size="2xl" alt={topBeatenUser.nickname} />
            <div>
              <div className="font-black text-lg">{topBeatenUser.nickname}</div>
              <div className="text-sm text-app-muted">
                W <b className="text-wc-green">{topBeaten!.wins}</b> meczach miałeś więcej punktów niż on
              </div>
            </div>
          </div>
        </div>
      )}

      <Card emoji="⚡" title="Mistrzowskich boostów" value={stats.successfulBoosts} />

      <div className="card p-6 text-center bg-gradient-to-br from-wc-red/10 via-wc-gold/10 to-wc-green/10 border-wc-gold/30">
        <div className="text-2xl mb-2">🦈</div>
        <div className="font-black">Dzięki za grę!</div>
        <p className="text-sm text-app-muted mt-1">
          Mundial 2026 to było coś. Do zobaczenia za 4 lata 🇪🇸 🇵🇹 🇲🇦
        </p>
      </div>
    </section>
  );
}

function Card({ emoji, title, value }: { emoji: string; title: string; value: React.ReactNode }) {
  return (
    <div className="card p-5 text-center">
      <div className="text-3xl mb-2">{emoji}</div>
      <div className="text-xs uppercase tracking-wider text-app-subtle">{title}</div>
      <div className="text-3xl font-black mt-2 tabular-nums">{value}</div>
    </div>
  );
}
