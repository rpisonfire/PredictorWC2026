import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const FLAGS: Record<string, string> = {
  // Brakujące z poprzedniego importu
  "Czechia": "🇨🇿",
  "Czech Republic": "🇨🇿",
  "Bosnia-Herzegovina": "🇧🇦",
  "Bosnia and Herzegovina": "🇧🇦",
  "Haiti": "🇭🇹",
  "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Curaçao": "🇨🇼",
  "Curacao": "🇨🇼",
  "Sweden": "🇸🇪",
  "Ivory Coast": "🇨🇮",
  "Côte d'Ivoire": "🇨🇮",
  "Cape Verde Islands": "🇨🇻",
  "Cape Verde": "🇨🇻",
  "Congo DR": "🇨🇩",
  "DR Congo": "🇨🇩",
  "Panama": "🇵🇦",
  "Iraq": "🇮🇶",
  "Uzbekistan": "🇺🇿",
  "Jordan": "🇯🇴",
  "Norway": "🇳🇴",
  "Algeria": "🇩🇿",
  "Egypt": "🇪🇬",
  "Colombia": "🇨🇴",
  // Tych z poprzedniego importu - na wszelki wypadek wymuszamy
  "Canada": "🇨🇦", "Mexico": "🇲🇽", "United States": "🇺🇸", "USA": "🇺🇸",
  "Argentina": "🇦🇷", "Brazil": "🇧🇷", "Uruguay": "🇺🇾",
  "Ecuador": "🇪🇨", "Paraguay": "🇵🇾",
  "France": "🇫🇷", "Spain": "🇪🇸", "Germany": "🇩🇪", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Portugal": "🇵🇹", "Netherlands": "🇳🇱", "Belgium": "🇧🇪",
  "Croatia": "🇭🇷", "Switzerland": "🇨🇭", "Denmark": "🇩🇰", "Austria": "🇦🇹",
  "Poland": "🇵🇱", "Serbia": "🇷🇸", "Turkey": "🇹🇷", "Türkiye": "🇹🇷",
  "Japan": "🇯🇵", "South Korea": "🇰🇷", "Korea Republic": "🇰🇷",
  "Iran": "🇮🇷", "Saudi Arabia": "🇸🇦", "Australia": "🇦🇺", "Qatar": "🇶🇦",
  "Morocco": "🇲🇦", "Senegal": "🇸🇳", "Tunisia": "🇹🇳",
  "Ghana": "🇬🇭", "Cameroon": "🇨🇲", "South Africa": "🇿🇦",
  "New Zealand": "🇳🇿",
};

async function main() {
  const teams = await prisma.team.findMany();
  let updated = 0;
  let skipped = 0;
  for (const t of teams) {
    const flag = FLAGS[t.name];
    if (!flag) { console.log(`  ⚠️  brak mapowania: ${t.name}`); skipped++; continue; }
    if (flag === t.flag) continue;
    await prisma.team.update({ where: { id: t.id }, data: { flag } });
    console.log(`  ✓ ${t.name} → ${flag}`);
    updated++;
  }
  console.log(`\n🏁 Zaktualizowano ${updated}, pominięto ${skipped}.`);
}

main().finally(() => prisma.$disconnect());
