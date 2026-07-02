import { prisma } from "./db";
import { prettyStage, isKnockoutStage } from "./stageLabel";
import {
  ADVANCEMENT,
  STAGE_FIRST_MATCH,
  bracketStageFromLabel,
  r16FifaNumber,
  stageOfFifaM,
  type AdvancementTarget,
} from "./wc2026Bracket";

/**
 * Logika propagacji awansu w drabince. Współdzielona przez panel admina
 * (ręczny zapis wyniku) i cron sync (wyniki z football-data.org).
 *
 * Kluczowe gwarancje:
 * - DETERMINIZM: mecze sortowane po (kickoff, id) - stabilny mapping FIFA M nawet
 *   gdy FD przesunie godziny albo dwa mecze mają identyczny kickoff.
 * - EXCLUSIVE PLACEMENT: przed wpisaniem drużyny w slot czyścimy ją ze WSZYSTKICH
 *   innych slotów fazy docelowej. Drużyna nigdy nie występuje w dwóch meczach naraz.
 * - OCHRONA ROZEGRANYCH: nie nadpisujemy slotu meczu, który ma już wynik.
 */

// Wszystkie mecze knockout w deterministycznej kolejności (kickoff, potem id jako tiebreak)
async function knockoutMatchesOrdered() {
  return prisma.match.findMany({
    where: { NOT: { stage: { startsWith: "Grupa" } } },
    orderBy: [{ kickoff: "asc" }, { id: "asc" }],
    select: { id: true, stage: true, homeTeamId: true, awayTeamId: true, homeScore: true },
  });
}

// Identyfikuje mecz po FIFA M number (M73-M104):
// - r16: po parze drużyn (jedyna pewna metoda - kolejność kickoff != numeracja FIFA)
// - r8/qf/sf: pozycja w posortowanej liście fazy (FD tworzy je w kolejności FIFA)
export async function fifaMNumberOfMatch(matchId: string): Promise<number | null> {
  const m = await prisma.match.findUnique({
    where: { id: matchId },
    include: { homeTeam: { select: { shortCode: true } }, awayTeam: { select: { shortCode: true } } },
  });
  if (!m) return null;
  const stage = bracketStageFromLabel(prettyStage(m.stage));
  if (!stage) return null;
  if (stage === "r16") return r16FifaNumber(m.homeTeam.shortCode, m.awayTeam.shortCode);
  if (stage === "final") return 104;
  if (stage === "bronze") return 103;
  const all = await knockoutMatchesOrdered();
  const inStage = all.filter((x) => bracketStageFromLabel(prettyStage(x.stage)) === stage);
  const idx = inStage.findIndex((x) => x.id === matchId);
  if (idx < 0) return null;
  return STAGE_FIRST_MATCH[stage] + idx;
}

// DB id meczu dla danego FIFA M number
export async function findMatchByFifaM(num: number): Promise<string | null> {
  const stage = stageOfFifaM(num);
  if (!stage) return null;
  const all = await knockoutMatchesOrdered();
  const inStage = all.filter((x) => bracketStageFromLabel(prettyStage(x.stage)) === stage);
  const idx = num - STAGE_FIRST_MATCH[stage];
  return inStage[idx]?.id ?? null;
}

/**
 * Wpisuje drużynę w docelowy slot GWARANTUJĄC że nie występuje w żadnym
 * innym meczu tej samej fazy (naprawa i prewencja dublowania).
 */
async function placeTeamExclusively(teamId: string, target: AdvancementTarget) {
  const targetId = await findMatchByFifaM(target.m);
  if (!targetId) return;
  const targetStage = stageOfFifaM(target.m);
  if (!targetStage) return;

  const tbd = await prisma.team.findUnique({ where: { shortCode: "TBD" } });

  const all = await knockoutMatchesOrdered();
  const inStage = all.filter((x) => bracketStageFromLabel(prettyStage(x.stage)) === targetStage);

  // 1. Wyczyść drużynę z pozostałych slotów fazy docelowej (duplikaty -> TBD)
  if (tbd) {
    for (const m of inStage) {
      if (m.id === targetId) continue;
      if (m.homeScore !== null) continue; // rozegranych nie ruszamy
      if (m.homeTeamId === teamId) {
        await prisma.match.update({ where: { id: m.id }, data: { homeTeamId: tbd.id } });
      }
      if (m.awayTeamId === teamId) {
        await prisma.match.update({ where: { id: m.id }, data: { awayTeamId: tbd.id } });
      }
    }
  }

  // 2. Wpisz w docelowy slot - chyba że mecz już rozegrany
  const targetMatch = inStage.find((m) => m.id === targetId);
  if (!targetMatch || targetMatch.homeScore !== null) return;
  await prisma.match.update({
    where: { id: targetId },
    data: target.slot === "home" ? { homeTeamId: teamId } : { awayTeamId: teamId },
  });
}

/**
 * Po zapisaniu wyniku meczu knockout: wpisz zwycięzcę do kolejnej rundy
 * (i przegranego do meczu o 3. miejsce w przypadku półfinałów).
 * Zwycięzca: wyższy wynik z gry, a przy remisie - wyższy wynik karnych.
 */
export async function propagateAdvancement(
  matchId: string,
  homeScore: number,
  awayScore: number,
  homeShootoutScore: number | null,
  awayShootoutScore: number | null,
) {
  const source = await prisma.match.findUnique({ where: { id: matchId } });
  if (!source) return;
  if (!isKnockoutStage(source.stage)) return;

  let winnerTeamId: string | null = null;
  let loserTeamId: string | null = null;
  if (homeScore > awayScore) {
    winnerTeamId = source.homeTeamId;
    loserTeamId = source.awayTeamId;
  } else if (awayScore > homeScore) {
    winnerTeamId = source.awayTeamId;
    loserTeamId = source.homeTeamId;
  } else if (homeShootoutScore !== null && awayShootoutScore !== null) {
    if (homeShootoutScore > awayShootoutScore) {
      winnerTeamId = source.homeTeamId;
      loserTeamId = source.awayTeamId;
    } else if (awayShootoutScore > homeShootoutScore) {
      winnerTeamId = source.awayTeamId;
      loserTeamId = source.homeTeamId;
    }
  }
  if (!winnerTeamId) return; // remis bez rozstrzygnięcia - nic nie robimy

  const sourceFifaM = await fifaMNumberOfMatch(matchId);
  if (sourceFifaM === null) return;
  const adv = ADVANCEMENT[sourceFifaM];
  if (!adv) return;

  await placeTeamExclusively(winnerTeamId, adv.winnerTo);
  if (adv.loserTo && loserTeamId) {
    await placeTeamExclusively(loserTeamId, adv.loserTo);
  }
}
