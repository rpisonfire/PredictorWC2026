/**
 * One-shot: naprawia zamienione pary 1/8 finału.
 *
 * Stan błędny: rekord 04/07 19:00 ma PAR-FRA, rekord 04/07 23:00 ma CAN-MAR.
 * Stan prawdziwy (FIFA/FD): 19:00 = CAN-MAR (M90), 23:00 = PAR-FRA (M89).
 *
 * Zamieniamy DRUŻYNY między rekordami (nie godziny - FD przy sync i tak
 * przywróciłby swoje godziny per rekord). Typy/boosty/komentarze przenosimy
 * razem z parami, żeby nikt nie stracił typu.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Znajdź oba mecze po składach (w 1/8)
  const r8 = await prisma.match.findMany({
    where: { stage: "1/8 finału" },
    include: { homeTeam: true, awayTeam: true },
  });
  const codes = (m: (typeof r8)[number]) => [m.homeTeam.shortCode, m.awayTeam.shortCode].sort().join("-");
  const matchParFra = r8.find((m) => codes(m) === "FRA-PAR");
  const matchCanMar = r8.find((m) => codes(m) === "CAN-MAR");
  if (!matchParFra || !matchCanMar) {
    console.log("Nie znaleziono obu par (FRA-PAR / CAN-MAR) w 1/8 - nic nie robię.");
    console.log("Znalezione pary:", r8.map(codes).join(", "));
    return;
  }
  if (matchParFra.homeScore !== null || matchCanMar.homeScore !== null) {
    console.log("Któryś z meczy ma już wynik - przerwano dla bezpieczeństwa.");
    return;
  }

  const A = matchParFra; // docelowo: CAN-MAR
  const B = matchCanMar; // docelowo: PAR-FRA
  console.log(`A: ${codes(A)} @ ${A.kickoff.toISOString()} (${A.id})`);
  console.log(`B: ${codes(B)} @ ${B.kickoff.toISOString()} (${B.id})`);

  await prisma.$transaction(async (tx) => {
    // 1. Zamień drużyny między rekordami
    await tx.match.update({
      where: { id: A.id },
      data: { homeTeamId: B.homeTeamId, awayTeamId: B.awayTeamId },
    });
    await tx.match.update({
      where: { id: B.id },
      data: { homeTeamId: A.homeTeamId, awayTeamId: A.awayTeamId },
    });

    // 2. Typy podążają za parą: zamiana per-user (unikamy kolizji unique(userId, matchId))
    const [predsA, predsB] = await Promise.all([
      tx.prediction.findMany({ where: { matchId: A.id } }),
      tx.prediction.findMany({ where: { matchId: B.id } }),
    ]);
    const byUserA = new Map(predsA.map((p) => [p.userId, p]));
    const byUserB = new Map(predsB.map((p) => [p.userId, p]));
    const userIds = new Set([...byUserA.keys(), ...byUserB.keys()]);
    let swapped = 0, moved = 0;
    for (const uid of userIds) {
      const pa = byUserA.get(uid);
      const pb = byUserB.get(uid);
      const content = (p: NonNullable<typeof pa>) => ({
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        firstScorerTeam: p.firstScorerTeam,
        firstGoalPlayerId: p.firstGoalPlayerId,
        pointsAwarded: p.pointsAwarded,
      });
      if (pa && pb) {
        // Oba typy istnieją - zamień zawartość (matchId zostają)
        const ca = content(pa);
        const cb = content(pb);
        await tx.prediction.update({ where: { id: pa.id }, data: cb });
        await tx.prediction.update({ where: { id: pb.id }, data: ca });
        swapped++;
      } else if (pa) {
        await tx.prediction.update({ where: { id: pa.id }, data: { matchId: B.id } });
        moved++;
      } else if (pb) {
        await tx.prediction.update({ where: { id: pb.id }, data: { matchId: A.id } });
        moved++;
      }
    }

    // 3. Boosty podążają za parą (unique to (userId, matchday) - bez kolizji)
    const [boostsA, boostsB] = await Promise.all([
      tx.boost.findMany({ where: { matchId: A.id }, select: { id: true } }),
      tx.boost.findMany({ where: { matchId: B.id }, select: { id: true } }),
    ]);
    for (const b of boostsA) await tx.boost.update({ where: { id: b.id }, data: { matchId: B.id } });
    for (const b of boostsB) await tx.boost.update({ where: { id: b.id }, data: { matchId: A.id } });

    // 4. Komentarze podążają za parą
    const [comA, comB] = await Promise.all([
      tx.comment.findMany({ where: { matchId: A.id }, select: { id: true } }),
      tx.comment.findMany({ where: { matchId: B.id }, select: { id: true } }),
    ]);
    for (const c of comA) await tx.comment.update({ where: { id: c.id }, data: { matchId: B.id } });
    for (const c of comB) await tx.comment.update({ where: { id: c.id }, data: { matchId: A.id } });

    console.log(`✓ Drużyny zamienione. Typy: ${swapped} zamienionych, ${moved} przeniesionych. Boosty: ${boostsA.length + boostsB.length}. Komentarze: ${comA.length + comB.length}.`);
  });

  console.log(`✓ Teraz: ${A.kickoff.toISOString()} = CAN-MAR, ${B.kickoff.toISOString()} = PAR-FRA`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
