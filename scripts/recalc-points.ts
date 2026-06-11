/**
 * Przelicza wszystkie typy ponownie wg aktualnego scoringu.
 * Użycie:  npx tsx scripts/recalc-points.ts
 *
 * Idempotentny - można puścić wielokrotnie.
 */
import { PrismaClient } from "@prisma/client";
import { scorePrediction } from "../src/lib/scoring";

const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.match.findMany({
    where: { homeScore: { not: null }, awayScore: { not: null } },
    include: { predictions: true },
  });

  let total = 0;
  let changed = 0;
  for (const m of matches) {
    for (const p of m.predictions) {
      const pts = scorePrediction(
        {
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          firstScorerTeam: (p.firstScorerTeam as any) ?? null,
          firstGoalPlayerId: p.firstGoalPlayerId,
        },
        {
          homeScore: m.homeScore!,
          awayScore: m.awayScore!,
          firstScorerTeam:
            m.firstScorerTeamId === m.homeTeamId ? "HOME"
            : m.firstScorerTeamId === m.awayTeamId ? "AWAY"
            : "NONE",
          firstGoalPlayerId: m.firstGoalPlayerId,
        }
      );
      total++;
      if (pts !== p.pointsAwarded) {
        await prisma.prediction.update({ where: { id: p.id }, data: { pointsAwarded: pts } });
        changed++;
      }
    }
  }

  console.log(`✓ Sprawdzono ${total} typów, zaktualizowano ${changed}.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
