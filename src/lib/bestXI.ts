// Najlepsza 11 turnieju - formacja 4-3-3.
// Slot -> wymagany kubełek pozycji + współrzędne na boisku (% szer/wys, boisko pionowe: GK na dole).

export type PositionBucket = "GK" | "DEF" | "MID" | "FWD";

export type XISlot = {
  key: string;
  label: string;
  bucket: PositionBucket;
  x: number; // % od lewej
  y: number; // % od góry (0 = linia ataku, 100 = bramka własna)
};

export const XI_SLOTS: XISlot[] = [
  // Atak (3)
  { key: "LW",  label: "LW", bucket: "FWD", x: 20, y: 14 },
  { key: "ST",  label: "ST", bucket: "FWD", x: 50, y: 10 },
  { key: "RW",  label: "RW", bucket: "FWD", x: 80, y: 14 },
  // Pomoc (3)
  { key: "CM1", label: "CM", bucket: "MID", x: 26, y: 40 },
  { key: "CM2", label: "CM", bucket: "MID", x: 50, y: 36 },
  { key: "CM3", label: "CM", bucket: "MID", x: 74, y: 40 },
  // Obrona (4)
  { key: "LB",  label: "LB", bucket: "DEF", x: 14, y: 66 },
  { key: "CB1", label: "CB", bucket: "DEF", x: 38, y: 70 },
  { key: "CB2", label: "CB", bucket: "DEF", x: 62, y: 70 },
  { key: "RB",  label: "RB", bucket: "DEF", x: 86, y: 66 },
  // Bramkarz
  { key: "GK",  label: "GK", bucket: "GK",  x: 50, y: 90 },
];

// Mapowanie surowej pozycji z football-data na kubełek
export function positionBucket(pos?: string | null): PositionBucket | null {
  if (!pos) return null;
  const p = pos.toLowerCase();
  if (p.includes("goal")) return "GK";
  if (p.includes("defence") || p.includes("defender") || p.includes("back")) return "DEF";
  if (p.includes("midfield")) return "MID";
  if (p.includes("forward") || p.includes("attack") || p.includes("offence") || p.includes("striker") || p.includes("winger")) return "FWD";
  return null;
}

export const BUCKET_LABEL: Record<PositionBucket, string> = {
  GK: "Bramkarz",
  DEF: "Obrońca",
  MID: "Pomocnik",
  FWD: "Napastnik",
};

// Ławka rezerwowych - 5 slotów bez wymagań pozycji
export const BENCH_SLOTS = ["SUB1", "SUB2", "SUB3", "SUB4", "SUB5"] as const;
export function isBenchSlot(key: string): boolean {
  return key.startsWith("SUB");
}

// Które pozycje naturalne pasują do danego slotu formacji.
// Pomocnicy i napastnicy są wymienni (Messi może grać w pomocy) - GK i DEF sztywno.
export const SLOT_ALLOWED_BUCKETS: Record<PositionBucket, PositionBucket[]> = {
  GK: ["GK"],
  DEF: ["DEF"],
  MID: ["MID", "FWD"],
  FWD: ["FWD", "MID"],
};
