import { prisma } from "./db";

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
  if (!firstKO) return { locked: false, lockAt: null };
  return { locked: Date.now() >= firstKO.kickoff.getTime(), lockAt: firstKO.kickoff };
}
