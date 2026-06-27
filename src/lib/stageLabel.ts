// Pomocnik - czytelna nazwa etapu (raw lub polska).
// W bazie czasem siedzi `LAST_32` (przed sync), czasem `1/16 finału` (po sync).
// Helper zawsze zwraca polski tekst.

const STAGE_REMAP: Record<string, string> = {
  LAST_32: "1/16 finału",
  LAST_16: "1/8 finału",
  QUARTER_FINALS: "Ćwierćfinał",
  SEMI_FINALS: "Półfinał",
  THIRD_PLACE: "Mecz o 3. miejsce",
  FINAL: "Finał",
};

export function prettyStage(raw: string): string {
  return STAGE_REMAP[raw] ?? raw;
}

export function isKnockoutStage(raw: string): boolean {
  const pretty = prettyStage(raw);
  return !pretty.startsWith("Grupa") && pretty !== "Faza grupowa";
}
