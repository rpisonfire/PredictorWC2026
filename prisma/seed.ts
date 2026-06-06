import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create demo league
  const league = await prisma.league.upsert({
    where: { inviteCode: "MUNDIAL2026" },
    update: {},
    create: { name: "Ekipa Mundial 2026", inviteCode: "MUNDIAL2026" },
  });

  // A few teams to demo
  const teams = [
    { name: "Polska", shortCode: "POL", flag: "🇵🇱" },
    { name: "Argentyna", shortCode: "ARG", flag: "🇦🇷" },
    { name: "Brazylia", shortCode: "BRA", flag: "🇧🇷" },
    { name: "Francja", shortCode: "FRA", flag: "🇫🇷" },
    { name: "Hiszpania", shortCode: "ESP", flag: "🇪🇸" },
    { name: "Niemcy", shortCode: "GER", flag: "🇩🇪" },
  ];

  const createdTeams = await Promise.all(
    teams.map((t) =>
      prisma.team.upsert({ where: { shortCode: t.shortCode }, update: {}, create: t })
    )
  );

  // A few demo players per team
  const playersByTeam: Record<string, string[]> = {
    POL: ["Robert Lewandowski", "Piotr Zieliński", "Nicola Zalewski"],
    ARG: ["Lionel Messi", "Julián Álvarez", "Lautaro Martínez"],
    BRA: ["Vinícius Jr", "Rodrygo", "Raphinha"],
    FRA: ["Kylian Mbappé", "Antoine Griezmann", "Ousmane Dembélé"],
    ESP: ["Lamine Yamal", "Nico Williams", "Álvaro Morata"],
    GER: ["Jamal Musiala", "Florian Wirtz", "Kai Havertz"],
  };

  for (const team of createdTeams) {
    const names = playersByTeam[team.shortCode] ?? [];
    for (const name of names) {
      await prisma.player.upsert({
        where: { id: `${team.shortCode}-${name}` },
        update: {},
        create: { id: `${team.shortCode}-${name}`, name, teamId: team.id },
      });
    }
  }

  // Demo matches
  const find = (code: string) => createdTeams.find((t) => t.shortCode === code)!;
  const now = new Date();
  const inHours = (h: number) => new Date(now.getTime() + h * 3600_000);

  const matches = [
    { matchday: 1, stage: "Grupa A", home: "POL", away: "ARG", kickoff: inHours(2) },
    { matchday: 1, stage: "Grupa B", home: "BRA", away: "FRA", kickoff: inHours(5) },
    { matchday: 1, stage: "Grupa C", home: "ESP", away: "GER", kickoff: inHours(8) },
    { matchday: 2, stage: "Grupa A", home: "ARG", away: "POL", kickoff: inHours(50) },
    { matchday: 2, stage: "Grupa B", home: "FRA", away: "BRA", kickoff: inHours(53) },
  ];

  for (const m of matches) {
    await prisma.match.create({
      data: {
        matchday: m.matchday,
        stage: m.stage,
        kickoff: m.kickoff,
        homeTeamId: find(m.home).id,
        awayTeamId: find(m.away).id,
      },
    });
  }

  console.log("✅ Seeded. Invite code:", league.inviteCode);
}

main().finally(() => prisma.$disconnect());
