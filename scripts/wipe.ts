import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.prediction.deleteMany({});
  await prisma.boost.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.match.deleteMany({});
  await prisma.membership.deleteMany({});
  await prisma.user.deleteMany({});
  console.log("🧹 Wyczyszczono: mecze, użytkownicy, typy, boosty, komentarze, członkostwa.");
  console.log("   Drużyny i zawodnicy zostają.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
