/**
 * Backup całej ligi do JSON - historia sezonu na wypadek wygaśnięcia bazy Neon.
 *
 * Eksportuje: users (bez haseł), ligi, drużyny, zawodników, mecze z wynikami,
 * typy z punktami, boosty, jedenastki turnieju, komentarze.
 *
 * Użycie: npx tsx scripts/export-backup.ts
 * Wynik:  backups/wc2026-backup-<data>.json (dodaj folder backups/ do .gitignore
 *         jeśli nie chcesz go w publicznym repo!)
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

async function main() {
  const [users, leagues, memberships, teams, players, matches, predictions, boosts, bestXI, comments] =
    await Promise.all([
      prisma.user.findMany({
        // BEZ passwordHash - backup może krążyć po dyskach
        select: {
          id: true, nickname: true, avatar: true, predictedChampionId: true,
          isAdmin: true, currentRank: true, previousRank: true, createdAt: true,
        },
      }),
      prisma.league.findMany(),
      prisma.membership.findMany(),
      prisma.team.findMany(),
      prisma.player.findMany(),
      prisma.match.findMany(),
      prisma.prediction.findMany(),
      prisma.boost.findMany(),
      prisma.bestXIPick.findMany(),
      prisma.comment.findMany(),
    ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    tournament: "FIFA World Cup 2026",
    counts: {
      users: users.length,
      teams: teams.length,
      players: players.length,
      matches: matches.length,
      predictions: predictions.length,
      boosts: boosts.length,
      bestXIPicks: bestXI.length,
      comments: comments.length,
    },
    users, leagues, memberships, teams, players, matches, predictions, boosts, bestXIPicks: bestXI, comments,
  };

  const dir = join(process.cwd(), "backups");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `wc2026-backup-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(file, JSON.stringify(backup, null, 2));
  console.log(`✓ Backup zapisany: ${file}`);
  console.log(JSON.stringify(backup.counts, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
