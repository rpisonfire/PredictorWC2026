import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const l = await prisma.league.upsert({
    where: { inviteCode: "MUNDIAL2026" },
    update: {},
    create: { name: "Ekipa Mundial 2026", inviteCode: "MUNDIAL2026" },
  });
  console.log(`✓ Liga: ${l.name} · kod: ${l.inviteCode}`);
}

main().finally(() => prisma.$disconnect());
