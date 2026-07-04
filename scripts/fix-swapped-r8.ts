/**
 * Naprawa typów po zamianie par 1/8 (PAR-FRA <-> CAN-MAR).
 *
 * Problem: przez bug mapowania drabinki drużyny w dwóch rekordach meczy 1/8
 * zamieniały się miejscami. Użytkownicy typowali "mecz z Francją", a rekord
 * później stał się meczem CAN-MAR - typ (w tym strzelec z Francji) został
 * przy złym meczu.
 *
 * Klasyfikacja: po drużynie wytypowanego strzelca. Jeśli typ na mecz CAN-MAR
 * ma strzelca z FRA/PAR -> typ należy do meczu PAR-FRA (i odwrotnie).
 * Typy bez strzelca zostają na miejscu (brak sygnału) - wypisujemy je do
 * ręcznej weryfikacji z updatedAt.
 *
 * Użycie:
 *   npx tsx scripts/fix-swapped-r8.ts           # dry-run (tylko raport)
 *   npx tsx scripts/fix-swapped-r8.ts --apply   # wykonaj zmiany + przelicz punkty
 */
import { PrismaClient } from "@prisma/client";
import { scorePrediction } from "../src/lib/scoring";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const PAIR_A = ["PAR", "FRA"]; // mecz A
const PAIR_B = ["CAN", "MAR"]; // mecz B

async function findMatchByPair(codes: string[]) {
  const matches = await prisma.match.findMany({
    where: { NOT: { stage: { startsWith: "Grupa" } } },
    include: {
      homeTeam: { select: { id: true, shortCode: true } },
      awayTeam: { select: { id: true, shortCode: true } },
    },
  });
  return matches.find(
    (m) =>
      codes.includes(m.homeTeam.shortCode) &&
      codes.includes(m.awayTeam.shortCode),
  );
}

async function recalcMatch(matchId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.homeScore === null || match.awayScore === null) {
    // brak wyniku - wyzeruj punkty (typy oczekujące)
    await prisma.prediction.updateMany({ where: { matchId }, data: { pointsAwarded: 0 } });
    return;
  }
  const preds = await prisma.prediction.findMany({ where: { matchId } });
  for (const p of preds) {
    const pts = scorePrediction(
      {
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        firstScorerTeam: (p.firstScorerTeam as any) ?? null,
        firstGoalPlayerId: p.firstGoalPlayerId,
      },
      {
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        firstScorerTeam:
          match.firstScorerTeamId === match.homeTeamId ? "HOME"
          : match.firstScorerTeamId === match.awayTeamId ? "AWAY"
          : "NONE",
        firstGoalPlayerId: match.firstGoalPlayerId,
      },
    );
    await prisma.prediction.update({ where: { id: p.id }, data: { pointsAwarded: pts } });
  }
}

async function main() {
  const matchA = await findMatchByPair(PAIR_A);
  const matchB = await findMatchByPair(PAIR_B);
  if (!matchA || !matchB) {
    throw new Error(`Nie znaleziono meczy: PAR-FRA=${matchA?.id ?? "BRAK"}, CAN-MAR=${matchB?.id ?? "BRAK"}`);
  }
  console.log(`Mecz A (${PAIR_A.join("-")}): ${matchA.id} · kickoff ${matchA.kickoff.toISOString()}`);
  console.log(`Mecz B (${PAIR_B.join("-")}): ${matchB.id} · kickoff ${matchB.kickoff.toISOString()}`);
  console.log(APPLY ? "\n=== TRYB APPLY - zmiany zostaną zapisane ===\n" : "\n=== DRY-RUN - tylko raport (dodaj --apply żeby wykonać) ===\n");

  // Wszystkie typy na oba mecze, ze strzelcem + jego drużyną
  const preds = await prisma.prediction.findMany({
    where: { matchId: { in: [matchA.id, matchB.id] } },
    include: {
      user: { select: { nickname: true } },
      player: { include: { team: { select: { shortCode: true } } } },
    },
  });

  // Który mecz pasuje do drużyny strzelca?
  const matchForTeam = (code: string) =>
    PAIR_A.includes(code) ? matchA.id : PAIR_B.includes(code) ? matchB.id : null;

  const toMove: { predId: string; from: string; to: string; who: string; why: string }[] = [];
  const unclassified: string[] = [];

  for (const p of preds) {
    if (!p.player) {
      unclassified.push(
        `  ? ${p.user.nickname}: ${p.homeScore}:${p.awayScore} na ${p.matchId === matchA.id ? "PAR-FRA" : "CAN-MAR"} (bez strzelca, updatedAt ${p.updatedAt.toISOString()})`,
      );
      continue;
    }
    const scorerTeam = p.player.team.shortCode;
    const intended = matchForTeam(scorerTeam);
    if (!intended) {
      unclassified.push(`  ? ${p.user.nickname}: strzelec ${p.player.name} (${scorerTeam}) nie pasuje do żadnej pary?!`);
      continue;
    }
    if (intended !== p.matchId) {
      toMove.push({
        predId: p.id,
        from: p.matchId,
        to: intended,
        who: p.user.nickname,
        why: `strzelec ${p.player.name} (${scorerTeam})`,
      });
    }
  }

  console.log(`Typów łącznie na oba mecze: ${preds.length}`);
  console.log(`Do przeniesienia: ${toMove.length}`);
  for (const m of toMove) {
    console.log(`  → ${m.who}: ${m.from === matchA.id ? "PAR-FRA → CAN-MAR" : "CAN-MAR → PAR-FRA"} (${m.why})`);
  }
  if (unclassified.length) {
    console.log(`\nBez klasyfikacji (sprawdź ręcznie czy typ pasuje do par):`);
    unclassified.forEach((u) => console.log(u));
  }

  if (!APPLY) {
    console.log("\nDry-run zakończony. Nic nie zmieniono.");
    return;
  }

  // Wykonanie: uwaga na unikalny constraint (userId, matchId) - użytkownik może
  // mieć typy na OBA mecze które się krzyżują. Robimy przez delete + create.
  const moving = await prisma.prediction.findMany({ where: { id: { in: toMove.map((m) => m.predId) } } });
  const targetById = new Map(toMove.map((m) => [m.predId, m.to]));

  await prisma.$transaction(async (tx) => {
    // 1. Usuń przenoszone
    await tx.prediction.deleteMany({ where: { id: { in: moving.map((p) => p.id) } } });
    // 2. Odtwórz z nowym matchId (konflikt = przenoszony wygrywa nad zostającym)
    for (const p of moving) {
      const to = targetById.get(p.id)!;
      await tx.prediction.deleteMany({ where: { userId: p.userId, matchId: to } });
      await tx.prediction.create({
        data: {
          userId: p.userId,
          matchId: to,
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          firstScorerTeam: p.firstScorerTeam,
          firstGoalPlayerId: p.firstGoalPlayerId,
          createdAt: p.createdAt,
        },
      });
    }
  });
  console.log(`\nPrzeniesiono ${moving.length} typów.`);

  // 3. Przelicz punkty obu meczy wg aktualnych wyników
  await recalcMatch(matchA.id);
  await recalcMatch(matchB.id);
  console.log("Punkty przeliczone dla obu meczy.");
  console.log("\nPamiętaj: odśwież /leaderboard (cache 15 min) albo zapisz dowolny wynik w adminie żeby zrobić revalidate.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
