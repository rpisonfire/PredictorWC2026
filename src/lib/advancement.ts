import { prisma } from "./db";
import { prettyStage, isKnockoutStage } from "./stageLabel";
import {
  ADVANCEMENT,
  STAGE_FIRST_MATCH,
  STAGE_COUNT,
  bracketStageFromLabel,
  r16FifaNumber,
  stageOfFifaM,
  type AdvancementTarget,
  type BracketStage,
} from "./wc2026Bracket";

/**
 * Identyfikacja meczów fazy pucharowej po numerach FIFA (M73-M104).
 *
 * PROBLEM który to rozwiązuje: numeracja FIFA w rundzie NIE jest chronologiczna
 * (np. M90 może grać się przed M89). Mapowanie "i-ty mecz po kickoff = M(first+i)"
 * potrafiło zamieniać pary miejscami - a football-data przy sync wpisywał je
 * z powrotem poprawnie, co dawało "skaczące" pary w drabince.
 *
 * ROZWIĄZANIE: mecze identyfikujemy po DRUŻYNACH przez łańcuch awansów:
 * - r16: para drużyn -> numer (R16_PAIR_TO_FIFA, drużyny znane od startu)
 * - r8/qf/sf: jeśli drużyna X wygrała mecz M(src), to mecz z X w składzie
 *   MUSI być meczem ADVANCEMENT[src].winnerTo.m - twarde dopasowanie
 * - finał = M104, brąz = M103 (jedyne w swoich fazach)
 * - fallback (tylko dla meczy w pełni TBD): wolne numery wg kolejności kickoff
 */

type KnockRow = {
  id: string;
  bracketStage: BracketStage;
  kickoff: Date;
  homeTeamId: string;
  awayTeamId: string;
  homeCode: string;
  awayCode: string;
  homeScore: number | null;
  awayScore: number | null;
  homeShootoutScore: number | null;
  awayShootoutScore: number | null;
};

async function loadKnockout(): Promise<KnockRow[]> {
  const rows = await prisma.match.findMany({
    where: { NOT: { stage: { startsWith: "Grupa" } } },
    orderBy: [{ kickoff: "asc" }, { id: "asc" }],
    include: {
      homeTeam: { select: { shortCode: true } },
      awayTeam: { select: { shortCode: true } },
    },
  });
  return rows
    .map((m) => ({
      id: m.id,
      bracketStage: bracketStageFromLabel(prettyStage(m.stage)) as BracketStage,
      kickoff: m.kickoff,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeCode: m.homeTeam.shortCode,
      awayCode: m.awayTeam.shortCode,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      homeShootoutScore: m.homeShootoutScore,
      awayShootoutScore: m.awayShootoutScore,
    }))
    .filter((m) => m.bracketStage != null);
}

// Zwycięzca meczu: wynik z gry, przy remisie karne. null = nierozstrzygnięty.
function winnerCodeOf(m: KnockRow): string | null {
  if (m.homeScore === null || m.awayScore === null) return null;
  if (m.homeScore > m.awayScore) return m.homeCode;
  if (m.awayScore > m.homeScore) return m.awayCode;
  if (m.homeShootoutScore !== null && m.awayShootoutScore !== null) {
    if (m.homeShootoutScore > m.awayShootoutScore) return m.homeCode;
    if (m.awayShootoutScore > m.homeShootoutScore) return m.awayCode;
  }
  return null;
}

export type FifaMapping = {
  byNum: Map<number, string>; // FIFA M -> match DB id
  byId: Map<string, number>;  // match DB id -> FIFA M
};

export async function buildFifaMapping(preloaded?: KnockRow[]): Promise<FifaMapping> {
  const all = preloaded ?? (await loadKnockout());
  const byNum = new Map<number, string>();
  const byId = new Map<string, number>();
  const assign = (num: number, id: string) => {
    if (byNum.has(num) || byId.has(id)) return;
    byNum.set(num, id);
    byId.set(id, num);
  };

  const byStage = new Map<BracketStage, KnockRow[]>();
  for (const m of all) {
    const arr = byStage.get(m.bracketStage) ?? [];
    arr.push(m);
    byStage.set(m.bracketStage, arr);
  }

  // r16: po parach drużyn (zawsze znane)
  for (const m of byStage.get("r16") ?? []) {
    const num = r16FifaNumber(m.homeCode, m.awayCode);
    if (num !== null) assign(num, m.id);
  }
  // finał i brąz - jedyne mecze w swoich fazach
  for (const m of byStage.get("final") ?? []) assign(104, m.id);
  for (const m of byStage.get("bronze") ?? []) assign(103, m.id);

  const rowById = new Map(all.map((m) => [m.id, m]));

  // r8 -> qf -> sf: dopasowanie po drużynach przez łańcuch awansów
  for (const stage of ["r8", "qf", "sf"] as const) {
    // Zwycięzcy już przypisanych numerów (poprzednie fazy)
    const winnerByNum = new Map<number, string>();
    for (const [num, id] of byNum) {
      const row = rowById.get(id);
      if (!row) continue;
      const w = winnerCodeOf(row);
      if (w && w !== "TBD") winnerByNum.set(num, w);
    }

    const list = byStage.get(stage) ?? [];

    // 1. Twarde dopasowanie: drużyna w meczu == zwycięzca meczu źródłowego
    for (const m of list) {
      if (byId.has(m.id)) continue;
      for (const code of [m.homeCode, m.awayCode]) {
        if (code === "TBD") continue;
        for (const [srcNum, w] of winnerByNum) {
          if (w !== code) continue;
          const adv = ADVANCEMENT[srcNum];
          if (!adv) continue;
          const target = adv.winnerTo.m;
          if (stageOfFifaM(target) !== stage) continue;
          assign(target, m.id);
          break;
        }
        if (byId.has(m.id)) break;
      }
    }

    // 2. Fallback: nieprzypisane mecze (pełne TBD) na wolne numery wg kickoff
    const first = STAGE_FIRST_MATCH[stage];
    const count = STAGE_COUNT[stage];
    const freeNums: number[] = [];
    for (let n = first; n < first + count; n++) {
      if (!byNum.has(n)) freeNums.push(n);
    }
    const unassigned = list.filter((m) => !byId.has(m.id)); // list już po kickoff asc
    unassigned.forEach((m, i) => {
      if (freeNums[i] !== undefined) assign(freeNums[i], m.id);
    });
  }

  return { byNum, byId };
}

/**
 * Wpisuje drużynę w docelowy slot GWARANTUJĄC że nie występuje w żadnym
 * innym meczu tej samej fazy (naprawa i prewencja dublowania).
 */
async function placeTeamExclusively(
  teamId: string,
  target: AdvancementTarget,
  all: KnockRow[],
  mapping: FifaMapping,
) {
  const targetId = mapping.byNum.get(target.m);
  if (!targetId) return;
  const targetStage = stageOfFifaM(target.m);
  if (!targetStage) return;

  const tbd = await prisma.team.findUnique({ where: { shortCode: "TBD" } });

  // 1. Wyczyść drużynę z pozostałych slotów fazy docelowej
  if (tbd) {
    for (const m of all) {
      if (m.bracketStage !== targetStage || m.id === targetId) continue;
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
  const targetRow = all.find((m) => m.id === targetId);
  if (!targetRow || targetRow.homeScore !== null) return;
  await prisma.match.update({
    where: { id: targetId },
    data: target.slot === "home" ? { homeTeamId: teamId } : { awayTeamId: teamId },
  });
}

/**
 * Po zapisaniu wyniku meczu knockout: wpisz zwycięzcę do kolejnej rundy
 * (i przegranego do meczu o 3. miejsce w przypadku półfinałów).
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
  if (!winnerTeamId) return;

  // Świeże dane (z właśnie zapisanym wynikiem) + mapping po drużynach
  const all = await loadKnockout();
  const mapping = await buildFifaMapping(all);
  const sourceFifaM = mapping.byId.get(matchId);
  if (sourceFifaM === undefined) return;
  const adv = ADVANCEMENT[sourceFifaM];
  if (!adv) return;

  await placeTeamExclusively(winnerTeamId, adv.winnerTo, all, mapping);
  if (adv.loserTo && loserTeamId) {
    await placeTeamExclusively(loserTeamId, adv.loserTo, all, mapping);
  }
}
