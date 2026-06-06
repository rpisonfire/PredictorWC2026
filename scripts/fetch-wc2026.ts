/**
 * Fetches FIFA World Cup 2026 data (teams, squads, photos) from API-Football
 * and seeds it into the local database.
 *
 * Usage:
 *   1. Get a free API key at https://www.api-football.com/ (Free tier: 100 req/day)
 *   2. Put it in .env:  FOOTBALL_API_KEY="your_key"
 *   3. Run:             npm run db:fetch              (default season=2026)
 *                   or  npm run db:fetch -- 2022      (fallback for testing)
 *
 * The script is idempotent — running it twice updates instead of duplicating.
 *
 * Note: API-Football's league ID for FIFA World Cup is 1.
 * Season 2026. If the tournament structure is not yet in the API, the script
 * will still try to fetch by country teams for the 48 known qualifiers.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const API_KEY = process.env.FOOTBALL_API_KEY;
const BASE = "https://v3.football.api-sports.io";

if (!API_KEY) {
  console.error("❌ Brak FOOTBALL_API_KEY w .env");
  process.exit(1);
}

const headers = { "x-apisports-key": API_KEY };
const SEASON = Number(process.argv[2] ?? process.env.SEASON ?? 2026);
console.log(`📅 Sezon: ${SEASON}`);

// Country emoji flags for the 48 qualified WC 2026 nations.
// Update this list once the playoff slots are filled.
const FLAGS: Record<string, string> = {
  Canada: "🇨🇦", Mexico: "🇲🇽", USA: "🇺🇸", "United-States": "🇺🇸",
  Argentina: "🇦🇷", Brazil: "🇧🇷", Uruguay: "🇺🇾", Colombia: "🇨🇴",
  Ecuador: "🇪🇨", Paraguay: "🇵🇾", Venezuela: "🇻🇪", Peru: "🇵🇪",
  France: "🇫🇷", Spain: "🇪🇸", Germany: "🇩🇪", England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  Portugal: "🇵🇹", Netherlands: "🇳🇱", Belgium: "🇧🇪", Italy: "🇮🇹",
  Croatia: "🇭🇷", Switzerland: "🇨🇭", Denmark: "🇩🇰", Austria: "🇦🇹",
  Poland: "🇵🇱", Serbia: "🇷🇸", Turkey: "🇹🇷", Norway: "🇳🇴",
  Japan: "🇯🇵", "South-Korea": "🇰🇷", "Korea-Republic": "🇰🇷",
  Iran: "🇮🇷", "Saudi-Arabia": "🇸🇦", Australia: "🇦🇺", Qatar: "🇶🇦",
  Morocco: "🇲🇦", Senegal: "🇸🇳", Tunisia: "🇹🇳", Egypt: "🇪🇬",
  Algeria: "🇩🇿", "Ivory-Coast": "🇨🇮", Ghana: "🇬🇭", Nigeria: "🇳🇬",
  Cameroon: "🇨🇲", "South-Africa": "🇿🇦",
  "New-Zealand": "🇳🇿", Uzbekistan: "🇺🇿", Jordan: "🇯🇴",
};

const SHORT: Record<string, string> = {
  "United States": "USA", "Korea Republic": "KOR", "South Korea": "KOR",
  "Ivory Coast": "CIV", "Saudi Arabia": "KSA", "New Zealand": "NZL",
  "South Africa": "RSA",
};

const shortCode = (name: string, code?: string) =>
  code?.toUpperCase() ?? SHORT[name] ?? name.slice(0, 3).toUpperCase();

const flagFor = (name: string) => FLAGS[name] ?? FLAGS[name.replace(/ /g, "-")] ?? "🏳️";

type ApiTeam = { team: { id: number; name: string; code?: string; logo: string } };
type ApiPlayer = {
  player: { id: number; name: string; photo: string; position?: string; number?: number };
};

async function api<T>(path: string, attempt = 1): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers });
  if (res.status === 429) {
    if (attempt > 5) throw new Error(`API ${path}: 429 (5x retry)`);
    const wait = 65; // free tier: 10 req/min — wait a full minute
    console.log(`     ⏳ rate limit, czekam ${wait}s...`);
    await new Promise((r) => setTimeout(r, wait * 1000));
    return api<T>(path, attempt + 1);
  }
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  const json = await res.json();
  return json.response as T;
}

async function main() {
  // Only wipe if we don't already have API-imported data (resumable)
  const existing = await prisma.team.findFirst({ where: { apiId: { not: null } } });
  if (!existing) {
    console.log("🧹 Czyszczę stare dane (demo)...");
    await prisma.prediction.deleteMany({});
    await prisma.boost.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.match.deleteMany({});
    await prisma.player.deleteMany({});
    await prisma.team.deleteMany({});
  } else {
    console.log("♻️  Wznawiam — pomijam drużyny które już mają zawodników.");
  }

  console.log("🌍 Pobieram drużyny MŚ 2026...");
  // League 1 = FIFA World Cup, season 2026
  const teams = await api<ApiTeam[]>(`/teams?league=1&season=${SEASON}`);
  console.log(`   ${teams.length} drużyn znalezionych`);

  if (teams.length === 0) {
    console.warn(`⚠️  API-Football nie ma danych MŚ dla season=${SEASON}.`);
    console.warn("    Spróbuj:  npm run db:fetch -- 2022");
    return;
  }

  for (const t of teams) {
    const name = t.team.name;
    await prisma.team.upsert({
      where: { apiId: t.team.id },
      update: { name, shortCode: shortCode(name, t.team.code), logoUrl: t.team.logo, flag: flagFor(name) },
      create: {
        apiId: t.team.id,
        name,
        shortCode: shortCode(name, t.team.code),
        logoUrl: t.team.logo,
        flag: flagFor(name),
      },
    });
    process.stdout.write(`  ⚽ ${name}: `);

    // Skip if already has players (resumable after rate limit)
    const dbTeamCheck = await prisma.team.findUnique({
      where: { apiId: t.team.id },
      include: { _count: { select: { players: true } } },
    });
    if (dbTeamCheck && dbTeamCheck._count.players > 0) {
      console.log(`${dbTeamCheck._count.players} zawodników (już w bazie, pomijam)`);
      continue;
    }

    // Squad — players for current season
    try {
      const squad = await api<ApiPlayer[]>(`/players?team=${t.team.id}&season=${SEASON}`);
      const dbTeam = await prisma.team.findUnique({ where: { apiId: t.team.id } });
      if (!dbTeam) continue;

      for (const p of squad) {
        await prisma.player.upsert({
          where: { apiId: p.player.id },
          update: {
            name: p.player.name,
            photoUrl: p.player.photo,
            position: p.player.position,
            number: p.player.number,
            teamId: dbTeam.id,
          },
          create: {
            apiId: p.player.id,
            name: p.player.name,
            photoUrl: p.player.photo,
            position: p.player.position,
            number: p.player.number,
            teamId: dbTeam.id,
          },
        });
      }
      console.log(`${squad.length} zawodników ✓`);
    } catch (e) {
      console.log(`błąd (${(e as Error).message})`);
    }

    // Free tier: 10 req/min — wait 7s between teams
    await new Promise((r) => setTimeout(r, 7000));
  }

  console.log("\n🏁 Gotowe. Sprawdź /admin lub /dashboard.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
