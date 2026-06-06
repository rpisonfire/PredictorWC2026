/**
 * One-shot: ustawia wynik Polska 2:0 Argentyna, pierwszy gol Zieliński,
 * i przelicza punkty wszystkich typujących.
 */
import { PrismaClient } from "@prisma/client";
import { scorePrediction } from "../src/lib/scoring";

const prisma = new PrismaClient();

async function main() {
  const poland = await prisma.team.findFirst({ where: { name: "Poland" } });
  const argentina = await prisma.team.findFirst({ where: { name: "Argentina" } });
  if (!poland || !argentina) throw new Error("Brak drużyn (puść db:fetch + db:fixtures)");

  const match = await prisma.match.findFirst({
    where: { homeTeamId: poland.id, awayTeamId: argentina.id },
    include: { homeTeam: { include: { players: true } } },
  });
  if (!match) throw new Error("Brak meczu Polska–Argentyna");

  const scorer = match.homeTeam.players.find((p) =>
    p.name.toLowerCase().includes("zielinski") || p.name.toLowerCase().includes("zieliński")
  );
  if (!scorer) {
    console.warn("⚠️ Nie znaleziono Zielińskiego, dostępni:");
    match.homeTeam.players.forEach((p) => console.log("   -", p.name));
    throw new Error("Brak Zielińskiego w składzie");
  }

  await prisma.match.update({
    where: { id: match.id },
    data: { homeScore: 2, awayScore: 0, firstGoalPlayerId: scorer.id },
  });
  console.log(`✓ Wynik: ${match.homeTeam.name} 2:0 Argentina, gol: ${scorer.name}`);

  // Recalculate points
  const preds = await prisma.prediction.findMany({ where: { matchId: match.id } });
  for (const p of preds) {
    const pts = scorePrediction(
      {
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        firstScorerTeam: (p.firstScorerTeam as any) ?? null,
        firstGoalPlayerId: p.firstGoalPlayerId,
      },
      { homeScore: 2, awayScore: 0, firstScorerTeam: "HOME", firstGoalPlayerId: scorer.id }
    );
    await prisma.prediction.update({ where: { id: p.id }, data: { pointsAwarded: pts } });
  }
  console.log(`✓ Przeliczono ${preds.length} typów`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
