import { prisma } from "./db";

// Fallback: oficjalna data startu 1/16 finału Mundialu 2026 (28 czerwca 2026, 21:00 CET / 19:00 UTC).
// Używane gdy w bazie nie ma jeszcze meczy pucharowych (przed sync z football-data).
const FALLBACK_LOCK_AT = new Date("2026-06-28T19:00:00.000Z");

/**
 * Mistrza turnieju można wybrać do końca fazy grupowej.
 * Lock = od kickoffu pierwszego meczu fazy pucharowej.
 */
export async function championPickIsLocked(): Promise<{ locked: boolean; lockAt: Date | null }> {
  const firstKO = await prisma.match.findFirst({
    where: { NOT: { stage: { startsWith: "Grupa" } } },
    orderBy: { kickoff: "asc" },
    select: { kickoff: true },
  });
  const lockAt = firstKO?.kickoff ?? FALLBACK_LOCK_AT;
  return { locked: Date.now() >= lockAt.getTime(), lockAt };
}
