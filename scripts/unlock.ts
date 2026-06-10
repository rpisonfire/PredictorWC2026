/**
 * Awaryjne odblokowanie zablokowanego konta.
 * Użycie:  npx tsx scripts/unlock.ts <nick>
 * Lub:     npx tsx scripts/unlock.ts --all   (odblokowuje wszystkich)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Użycie: npx tsx scripts/unlock.ts <nick>   lub   --all");
    process.exit(1);
  }

  if (arg === "--all") {
    const r = await prisma.user.updateMany({
      where: { OR: [{ failedAttempts: { gt: 0 } }, { lockedUntil: { not: null } }] },
      data: { failedAttempts: 0, lockedUntil: null },
    });
    console.log(`✓ Odblokowano ${r.count} kont`);
    return;
  }

  const user = await prisma.user.findUnique({ where: { nickname: arg } });
  if (!user) {
    console.error(`❌ Nie ma użytkownika "${arg}"`);
    process.exit(1);
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null },
  });
  console.log(`✓ ${arg} odblokowany`);
}

main().finally(() => prisma.$disconnect());
