import { prisma } from "./db";

export type TeamStanding = {
  teamId: string;
  name: string;
  flag: string;
  shortCode: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number; // goals for
  ga: number; // goals against
  gd: number; // goal difference
  points: number;
};

export type Group = {
  name: string;     // np. "Grupa A"
  teams: TeamStanding[];
};

export async function groupStandings(): Promise<Group[]> {
  const matches = await prisma.match.findMany({
    where: { stage: { startsWith: "Grupa" } },
    include: { homeTeam: true, awayTeam: true },
  });

  // Aggregate per group → per team
  const map = new Map<string, Map<string, TeamStanding>>();
  const ensureGroup = (groupName: string) => {
    if (!map.has(groupName)) map.set(groupName, new Map());
    return map.get(groupName)!;
  };
  const ensureTeam = (g: Map<string, TeamStanding>, t: { id: string; name: string; flag: string; shortCode: string }) => {
    if (!g.has(t.id)) {
      g.set(t.id, {
        teamId: t.id, name: t.name, flag: t.flag, shortCode: t.shortCode,
        played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0,
      });
    }
    return g.get(t.id)!;
  };

  for (const m of matches) {
    const g = ensureGroup(m.stage);
    const h = ensureTeam(g, m.homeTeam);
    const a = ensureTeam(g, m.awayTeam);

    if (m.homeScore == null || m.awayScore == null) continue;
    h.played++; a.played++;
    h.gf += m.homeScore; h.ga += m.awayScore;
    a.gf += m.awayScore; a.ga += m.homeScore;

    if (m.homeScore > m.awayScore) {
      h.won++; a.lost++; h.points += 3;
    } else if (m.homeScore < m.awayScore) {
      a.won++; h.lost++; a.points += 3;
    } else {
      h.drawn++; a.drawn++; h.points++; a.points++;
    }
  }

  const groups: Group[] = [];
  for (const [name, teams] of map.entries()) {
    const arr = [...teams.values()].map((t) => ({ ...t, gd: t.gf - t.ga }));
    arr.sort((a, b) =>
      b.points - a.points ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      a.name.localeCompare(b.name)
    );
    groups.push({ name, teams: arr });
  }
  groups.sort((a, b) => a.name.localeCompare(b.name));
  return groups;
}
