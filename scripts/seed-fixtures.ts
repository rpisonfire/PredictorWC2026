/**
 * Adds a few demo matches using real teams already in the database.
 * Run after the API fetch:  npm run db:fixtures
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FIXTURES: { matchday: number; stage: string; home: string; away: string; hoursFromNow: number }[] = [
  { matchday: 1, stage: "Grupa A", home: "Poland",      away: "Argentina",   hoursFromNow: 2 },
  { matchday: 1, stage: "Grupa A", home: "France",      away: "Brazil",      hoursFromNow: 5 },
  { matchday: 1, stage: "Grupa B", home: "Spain",       away: "Germany",     hoursFromNow: 8 },
  { matchday: 1, stage: "Grupa B", home: "England",     away: "Netherlands", hoursFromNow: 24 },
  { matchday: 2, stage: "Grupa A", home: "Argentina",   away: "France",      hoursFromNow: 50 },
  { matchday: 2, stage: "Grupa A", home: "Brazil",      away: "Poland",      hoursFromNow: 53 },
  { matchday: 2, stage: "Grupa B", home: "Germany",     away: "England",     hoursFromNow: 56 },
  { matchday: 2, stage: "Grupa B", home: "Netherlands", away: "Spain",       hoursFromNow: 59 },
  { matchday: 3, stage: "1/8 finału", home: "Portugal",   away: "Morocco",   hoursFromNow: 96 },
  { matchday: 3, stage: "1/8 finału", home: "Croatia",    away: "Japan",     hoursFromNow: 99 },
];

async function main() {
  await prisma.match.deleteMany({});
  console.log("🗓  Dodaję mecze...");

  const now = Date.now();
  let added = 0;

  for (const f of FIXTURES) {
    const home = await prisma.team.findFirst({ where: { name: f.home } });
    const away = await prisma.team.findFirst({ where: { name: f.away } });
    if (!home || !away) {
      console.warn(`   ⚠️  Pomijam ${f.home} vs ${f.away} (brak drużyny w bazie)`);
      continue;
    }
    await prisma.match.create({
      data: {
        matchday: f.matchday,
        stage: f.stage,
        kickoff: new Date(now + f.hoursFromNow * 3600_000),
        homeTeamId: home.id,
        awayTeamId: away.id,
      },
    });
    console.log(`   ⚽ ${f.home} vs ${f.away} (${f.stage}, kolejka ${f.matchday})`);
    added++;
  }

  console.log(`\n🏁 Dodano ${added} meczów.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
