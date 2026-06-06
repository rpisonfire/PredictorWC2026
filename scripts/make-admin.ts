/**
 * Nadaj komuś uprawnienia admina.
 * Użycie:  npx tsx scripts/make-admin.ts <nick>
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const nickname = process.argv[2];
  if (!nickname) {
    console.error("Podaj nick: npx tsx scripts/make-admin.ts <nick>");
    process.exit(1);
  }
  const user = await prisma.user.findUnique({ where: { nickname } });
  if (!user) {
    console.error(`❌ Nie ma użytkownika "${nickname}"`);
    process.exit(1);
  }
  await prisma.user.update({ where: { id: user.id }, data: { isAdmin: true } });
  console.log(`✓ ${nickname} jest teraz adminem`);
}

main().finally(() => prisma.$disconnect());
