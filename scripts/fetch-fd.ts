/**
 * Pobiera drużyny, składy i terminarz MŚ 2026 z football-data.org (darmowy tier).
 *
 * Konfiguracja:
 *   1. Zarejestruj się: https://www.football-data.org/client/register
 *   2. Skopiuj API token z e-maila
 *   3. Dodaj do .env:  FOOTBALL_DATA_TOKEN="twój_token"
 *   4. Odpal:          npm run db:fd
 *
 * Limity free: 10 req/min. Skrypt sam czeka między zapytaniami.
 * Brak zdjęć zawodników - UI pokaże inicjały.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TOKEN = process.env.FOOTBALL_DATA_TOKEN;
if (!TOKEN) { console.error("❌ Brak FOOTBALL_DATA_TOKEN w .env"); process.exit(1); }

const BASE = "https://api.football-data.org/v4";
const headers = { "X-Auth-Token": TOKEN };

const FLAGS: Record<string, string> = {
  Canada: "🇨🇦", Mexico: "🇲🇽", USA: "🇺🇸", "United States": "🇺🇸",
  Argentina: "🇦🇷", Brazil: "🇧🇷", Uruguay: "🇺🇾", Colombia: "🇨🇴",
  Ecuador: "🇪🇨", Paraguay: "🇵🇾", Venezuela: "🇻🇪", Peru: "🇵🇪",
  France: "🇫🇷", Spain: "🇪🇸", Germany: "🇩🇪", England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  Portugal: "🇵🇹", Netherlands: "🇳🇱", Belgium: "🇧🇪", Italy: "🇮🇹",
  Croatia: "🇭🇷", Switzerland: "🇨🇭", Denmark: "🇩🇰", Austria: "🇦🇹",
  Poland: "🇵🇱", Serbia: "🇷🇸", "Türkiye": "🇹🇷", Turkey: "🇹🇷", Norway: "🇳🇴",
  Japan: "🇯🇵", "Korea Republic": "🇰🇷", "South Korea": "🇰🇷",
  Iran: "🇮🇷", "Saudi Arabia": "🇸🇦", Australia: "🇦🇺", Qatar: "🇶🇦",
  Morocco: "🇲🇦", Senegal: "🇸🇳", Tunisia: "🇹🇳", Egypt: "🇪🇬",
  Algeria: "🇩🇿", "Ivory Coast": "🇨🇮", "Côte d'Ivoire": "🇨🇮",
  Ghana: "🇬🇭", Nigeria: "🇳🇬", Cameroon: "🇨🇲", "South Africa": "🇿🇦",
  "New Zealand": "🇳🇿", Uzbekistan: "🇺🇿", Jordan: "🇯🇴",
  Wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", "Costa Rica": "🇨🇷",
  // Dodatkowe kraje WC 2026 i ich warianty nazw z football-data.org
  Czechia: "🇨🇿", "Czech Republic": "🇨🇿",
  "Bosnia-Herzegovina": "🇧🇦", "Bosnia and Herzegovina": "🇧🇦",
  Haiti: "🇭🇹", Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "Curaçao": "🇨🇼", "Curacao": "🇨🇼",
  Sweden: "🇸🇪", Panama: "🇵🇦", "Cape Verde Islands": "🇨🇻", "Cape Verde": "🇨🇻",
  "Congo DR": "🇨🇩", "DR Congo": "🇨🇩", Iraq: "🇮🇶",
};

const SHORT: Record<string, string> = {
  "United States": "USA", "Korea Republic": "KOR", "South Korea": "KOR",
  "Ivory Coast": "CIV", "Côte d'Ivoire": "CIV", "Saudi Arabia": "KSA",
  "New Zealand": "NZL", "South Africa": "RSA", "Costa Rica": "CRC",
  "Türkiye": "TUR",
};

const flagFor = (name: string) => FLAGS[name] ?? "🏳️";
const shortCode = (name: string, tla?: string) =>
  tla?.toUpperCase() ?? SHORT[name] ?? name.slice(0, 3).toUpperCase();

async function api<T>(path: string, attempt = 1): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers });
  if (res.status === 429) {
    if (attempt > 5) throw new Error(`429 (5x)`);
    console.log(`     ⏳ rate limit, czekam 65s...`);
    await new Promise((r) => setTimeout(r, 65000));
    return api<T>(path, attempt + 1);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${path}: ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

type ApiTeam = { id: number; name: string; tla: string; crest: string; shortName?: string };
type ApiPlayer = { id: number; name: string; position?: string; dateOfBirth?: string; nationality?: string };
type ApiMatch = {
  id: number;
  utcDate: string;
  matchday?: number;
  stage: string;
  group?: string;
  status: string;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  score?: { fullTime?: { home: number | null; away: number | null } };
};

async function main() {
  // Tryb bezpieczny (default): tylko upsert - zero usuwania.
  // Z flagą --wipe: pełne wyczyszczenie (do testów/setupu, NIE używać w trakcie turnieju)
  const WIPE = process.argv.includes("--wipe");

  if (WIPE) {
    console.log("🧹 --wipe: czyszczę WSZYSTKO (predykcje/typy/komentarze/mecze/zawodnicy/drużyny)...");
    await prisma.prediction.deleteMany({});
    await prisma.boost.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.match.deleteMany({});
    await prisma.user.updateMany({ data: { predictedChampionId: null } });
    await prisma.league.updateMany({ data: { actualChampionId: null } });
    await prisma.player.deleteMany({});
    await prisma.team.deleteMany({});
  } else {
    console.log("♻️  Tryb bezpieczny - tylko upsert. Predykcje, typy, komentarze ZOSTAJĄ. (Użyj --wipe żeby wyczyścić wszystko.)");
  }

  console.log("🌍 Pobieram drużyny MŚ 2026...");
  const tj = await api<{ teams: ApiTeam[] }>("/competitions/WC/teams?season=2026");
  console.log(`   ${tj.teams.length} drużyn`);

  for (const t of tj.teams) {
    await prisma.team.upsert({
      where: { apiId: t.id },
      update: { name: t.name, shortCode: shortCode(t.name, t.tla), logoUrl: t.crest, flag: flagFor(t.name) },
      create: {
        apiId: t.id, name: t.name, shortCode: shortCode(t.name, t.tla),
        logoUrl: t.crest, flag: flagFor(t.name),
      },
    });
    process.stdout.write(`  ⚽ ${t.name}: `);

    const dbTeam = await prisma.team.findUnique({ where: { apiId: t.id } });
    if (!dbTeam) { console.log("brak teamu w DB?!"); continue; }

    try {
      const squadJ = await api<{ squad: ApiPlayer[] }>(`/teams/${t.id}`);
      const apiPlayerIds = new Set(squadJ.squad.map((p) => p.id));

      // 1. Upsert wszystkich z API
      for (const p of squadJ.squad) {
        await prisma.player.upsert({
          where: { apiId: p.id },
          update: { name: p.name, position: p.position, teamId: dbTeam.id },
          create: { apiId: p.id, name: p.name, position: p.position, teamId: dbTeam.id },
        });
      }

      // 2. Znajdź zawodników w bazie którzy zniknęli z API (kontuzje, zmiany kadry)
      const dbPlayers = await prisma.player.findMany({
        where: { teamId: dbTeam.id, apiId: { not: null } },
        select: { id: true, apiId: true, name: true },
      });
      const dropped = dbPlayers.filter((p) => p.apiId != null && !apiPlayerIds.has(p.apiId));

      let droppedCount = 0;
      let invalidatedPicks = 0;
      for (const p of dropped) {
        // Null out predictions wskazujące na tego zawodnika (kumple będą musieli wybrać ponownie)
        const upd = await prisma.prediction.updateMany({
          where: { firstGoalPlayerId: p.id },
          data: { firstGoalPlayerId: null },
        });
        invalidatedPicks += upd.count;
        await prisma.player.delete({ where: { id: p.id } });
        droppedCount++;
      }

      const msg = `${squadJ.squad.length} zawodników ✓`
        + (droppedCount > 0 ? ` (usunięto ${droppedCount}${invalidatedPicks ? `, anulowano ${invalidatedPicks} typów strzelca` : ""})` : "");
      console.log(msg);
    } catch (e) {
      console.log(`błąd (${(e as Error).message.slice(0, 80)})`);
    }
    await new Promise((r) => setTimeout(r, 7000));
  }

  // Fixtures
  console.log("\n🗓  Pobieram terminarz...");
  try {
    const mj = await api<{ matches: ApiMatch[] }>("/competitions/WC/matches?season=2026");
    console.log(`   ${mj.matches.length} meczów`);

    // Zapewnij TBD placeholder team - używany gdy football-data jeszcze nie wie kto awansuje
    const tbdTeam = await prisma.team.upsert({
      where: { shortCode: "TBD" },
      update: {},
      create: { name: "TBD", shortCode: "TBD", flag: "🏳️" },
    });

    let saved = 0, updatedToReal = 0, skipped = 0;
    for (const m of mj.matches) {
      try {
        const home = m.homeTeam?.id ? await prisma.team.findUnique({ where: { apiId: m.homeTeam.id } }) : null;
        const away = m.awayTeam?.id ? await prisma.team.findUnique({ where: { apiId: m.awayTeam.id } }) : null;
        const homeId = home?.id ?? tbdTeam.id;
        const awayId = away?.id ?? tbdTeam.id;
        const stage = m.group ? `Grupa ${m.group.replace("GROUP_", "")}` : translateStage(m.stage);
        const md = m.matchday ?? stageOrder(m.stage);
        const finished = m.status === "FINISHED";

        // Sprawdź czy mecz już istniał z TBD - jeśli tak i teraz mamy realne drużyny, log it
        const existing = await prisma.match.findUnique({ where: { id: `fd-${m.id}` }, select: { homeTeamId: true, awayTeamId: true } });
        const wasReal = existing && existing.homeTeamId !== tbdTeam.id && existing.awayTeamId !== tbdTeam.id;
        const nowReal = homeId !== tbdTeam.id && awayId !== tbdTeam.id;
        if (existing && !wasReal && nowReal) updatedToReal++;

        await prisma.match.upsert({
          where: { id: `fd-${m.id}` },
          update: {
            kickoff: new Date(m.utcDate),
            homeTeamId: homeId,
            awayTeamId: awayId,
            homeScore: finished ? (m.score?.fullTime?.home ?? null) : null,
            awayScore: finished ? (m.score?.fullTime?.away ?? null) : null,
          },
          create: {
            id: `fd-${m.id}`, matchday: md, stage, kickoff: new Date(m.utcDate),
            homeTeamId: homeId, awayTeamId: awayId,
            homeScore: finished ? (m.score?.fullTime?.home ?? null) : null,
            awayScore: finished ? (m.score?.fullTime?.away ?? null) : null,
          },
        });
        saved++;
      } catch (e) {
        skipped++;
      }
    }
    console.log(`✓ Zapisano ${saved} meczów${updatedToReal > 0 ? ` (z czego ${updatedToReal} dostało prawdziwe drużyny - awanse podlinkowane!)` : ""}${skipped > 0 ? ` · ${skipped} błędów` : ""}`);
  } catch (e) {
    console.log(`⚠️  Terminarz: ${(e as Error).message.slice(0, 120)}`);
  }

  console.log("\n🏁 Gotowe.");
}

function translateStage(s: string): string {
  const m: Record<string, string> = {
    GROUP_STAGE: "Faza grupowa",
    LAST_16: "1/8 finału",
    QUARTER_FINALS: "Ćwierćfinał",
    SEMI_FINALS: "Półfinał",
    THIRD_PLACE: "Mecz o 3. miejsce",
    FINAL: "Finał",
  };
  return m[s] ?? s;
}

function stageOrder(s: string): number {
  const m: Record<string, number> = {
    GROUP_STAGE: 1, LAST_16: 4, QUARTER_FINALS: 5,
    SEMI_FINALS: 6, THIRD_PLACE: 7, FINAL: 8,
  };
  return m[s] ?? 1;
}

main().catch(console.error).finally(() => prisma.$disconnect());
