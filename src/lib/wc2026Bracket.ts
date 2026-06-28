// Oficjalna struktura drabinki Mundial 2026 (z Wikipedii / Annex C regulacji FIFA).
// FIFA numeruje mecze fazy pucharowej M73-M104. Drzewo awansowe jest sztywne.
//
// Kolejność wyświetlania w tree dobieram tak, by para 1/16 wpadała w jeden mecz 1/8,
// para 1/8 wpadała w jeden mecz QF, itd. - czyli wizualnie drzewo zwęża się ku centrum.
//
// Drzewo awansowe (winners):
//   M74,M77 -> M89   |   M73,M75 -> M90   |   M83,M84 -> M93   |   M81,M82 -> M94
//   M76,M78 -> M91   |   M79,M80 -> M92   |   M86,M88 -> M95   |   M85,M87 -> M96
//   M89,M90 -> M97   |   M93,M94 -> M98   |   M91,M92 -> M99   |   M95,M96 -> M100
//   M97,M98 -> M101 (SF1, lewa)         |   M99,M100 -> M102 (SF2, prawa)
//   M101,M102 -> M104 (Final)           |   loser M101, loser M102 -> M103 (brąz)

export type BracketStage = "r16" | "r8" | "qf" | "sf" | "final" | "bronze";
export type BracketSide = "L" | "R" | "C";

export type BracketSlot = {
  matchNumber: number; // M73..M104
  side: BracketSide;
  stage: BracketStage;
  row: number; // top-to-bottom w danej kolumnie
};

// Pełna mapa slotów - 32 mecze
export const BRACKET_SLOTS: BracketSlot[] = [
  // Lewa 1/16 (góra -> dół): pary wpadają w M89, M90, M93, M94
  { matchNumber: 74, side: "L", stage: "r16", row: 0 },
  { matchNumber: 77, side: "L", stage: "r16", row: 1 },
  { matchNumber: 73, side: "L", stage: "r16", row: 2 },
  { matchNumber: 75, side: "L", stage: "r16", row: 3 },
  { matchNumber: 83, side: "L", stage: "r16", row: 4 },
  { matchNumber: 84, side: "L", stage: "r16", row: 5 },
  { matchNumber: 81, side: "L", stage: "r16", row: 6 },
  { matchNumber: 82, side: "L", stage: "r16", row: 7 },
  // Lewa 1/8
  { matchNumber: 89, side: "L", stage: "r8", row: 0 },
  { matchNumber: 90, side: "L", stage: "r8", row: 1 },
  { matchNumber: 93, side: "L", stage: "r8", row: 2 },
  { matchNumber: 94, side: "L", stage: "r8", row: 3 },
  // Lewa QF
  { matchNumber: 97, side: "L", stage: "qf", row: 0 },
  { matchNumber: 98, side: "L", stage: "qf", row: 1 },
  // Lewa SF
  { matchNumber: 101, side: "L", stage: "sf", row: 0 },

  // Prawa SF
  { matchNumber: 102, side: "R", stage: "sf", row: 0 },
  // Prawa QF
  { matchNumber: 99, side: "R", stage: "qf", row: 0 },
  { matchNumber: 100, side: "R", stage: "qf", row: 1 },
  // Prawa 1/8
  { matchNumber: 91, side: "R", stage: "r8", row: 0 },
  { matchNumber: 92, side: "R", stage: "r8", row: 1 },
  { matchNumber: 95, side: "R", stage: "r8", row: 2 },
  { matchNumber: 96, side: "R", stage: "r8", row: 3 },
  // Prawa 1/16: pary wpadają w M91, M92, M95, M96
  { matchNumber: 76, side: "R", stage: "r16", row: 0 },
  { matchNumber: 78, side: "R", stage: "r16", row: 1 },
  { matchNumber: 79, side: "R", stage: "r16", row: 2 },
  { matchNumber: 80, side: "R", stage: "r16", row: 3 },
  { matchNumber: 86, side: "R", stage: "r16", row: 4 },
  { matchNumber: 88, side: "R", stage: "r16", row: 5 },
  { matchNumber: 85, side: "R", stage: "r16", row: 6 },
  { matchNumber: 87, side: "R", stage: "r16", row: 7 },

  // Centrum
  { matchNumber: 104, side: "C", stage: "final", row: 0 },
  { matchNumber: 103, side: "C", stage: "bronze", row: 0 },
];

// Kolejność chronologiczna meczy per faza (po kickoff asc).
// FIFA planuje mecze w kolejności numerów (M73 pierwszy, M88 ostatni w 1/16),
// więc indeks w posortowanej tablicy meczy = offset numeru meczu od początku fazy.
export const STAGE_FIRST_MATCH: Record<BracketStage, number> = {
  r16: 73,
  r8: 89,
  qf: 97,
  sf: 101,
  bronze: 103,
  final: 104,
};

export const STAGE_COUNT: Record<BracketStage, number> = {
  r16: 16,
  r8: 8,
  qf: 4,
  sf: 2,
  bronze: 1,
  final: 1,
};

export function slotByMatchNumber(num: number): BracketSlot | null {
  return BRACKET_SLOTS.find((s) => s.matchNumber === num) ?? null;
}

// Mapuje stage (z naszej DB, prettyStage) na BracketStage.
// "Mecz o 3. miejsce" rozpoznajemy osobno bo Match.stage często to "Półfinał" + flagą.
export function bracketStageFromLabel(label: string): BracketStage | null {
  switch (label) {
    case "1/16 finału": return "r16";
    case "1/8 finału": return "r8";
    case "Ćwierćfinał": return "qf";
    case "Półfinał": return "sf";
    case "Mecz o 3. miejsce": return "bronze";
    case "Finał": return "final";
    default: return null;
  }
}
