// Mapowanie shortCode drużyny -> kolory flagi do akcentu na karcie meczu.
// Format: { primary, secondary?, glow }
// Fallback: czerwony akcent gdy kraj nie wymieniony.

type TeamColor = { primary: string; secondary?: string; glow: string };

const COLORS: Record<string, TeamColor> = {
  // CONMEBOL
  ARG: { primary: "#75AADB", secondary: "#FFFFFF", glow: "rgba(117,170,219,0.25)" },
  BRA: { primary: "#FFCC00", secondary: "#009C3B", glow: "rgba(255,204,0,0.25)" },
  URU: { primary: "#75AADB", secondary: "#FFCC00", glow: "rgba(117,170,219,0.25)" },
  COL: { primary: "#FFCD00", secondary: "#003893", glow: "rgba(255,205,0,0.25)" },
  PAR: { primary: "#D52B1E", secondary: "#0038A8", glow: "rgba(213,43,30,0.25)" },
  ECU: { primary: "#FFD100", secondary: "#0033A0", glow: "rgba(255,209,0,0.25)" },

  // CONCACAF
  USA: { primary: "#BF0A30", secondary: "#002868", glow: "rgba(191,10,48,0.3)" },
  CAN: { primary: "#FF0000", secondary: "#FFFFFF", glow: "rgba(255,0,0,0.25)" },
  MEX: { primary: "#006847", secondary: "#CE1126", glow: "rgba(0,104,71,0.3)" },
  CRC: { primary: "#0033A0", secondary: "#CE1126", glow: "rgba(0,51,160,0.25)" },
  HAI: { primary: "#00209F", secondary: "#D21034", glow: "rgba(0,32,159,0.25)" },
  CUW: { primary: "#012A87", secondary: "#FFE800", glow: "rgba(255,232,0,0.25)" },
  PAN: { primary: "#005AA7", secondary: "#D21034", glow: "rgba(0,90,167,0.25)" },

  // UEFA
  GER: { primary: "#000000", secondary: "#DD0000", glow: "rgba(255,206,0,0.3)" },
  ESP: { primary: "#AA151B", secondary: "#F1BF00", glow: "rgba(241,191,0,0.3)" },
  ENG: { primary: "#FFFFFF", secondary: "#CE1124", glow: "rgba(206,17,38,0.3)" },
  FRA: { primary: "#0055A4", secondary: "#EF4135", glow: "rgba(0,85,164,0.3)" },
  POR: { primary: "#006600", secondary: "#FF0000", glow: "rgba(0,102,0,0.3)" },
  NED: { primary: "#FF6700", secondary: "#21468B", glow: "rgba(255,103,0,0.3)" },
  BEL: { primary: "#FDDA24", secondary: "#EF3340", glow: "rgba(253,218,36,0.3)" },
  ITA: { primary: "#0066B3", secondary: "#FFFFFF", glow: "rgba(0,102,179,0.3)" },
  CRO: { primary: "#FF0000", secondary: "#FFFFFF", glow: "rgba(255,0,0,0.25)" },
  POL: { primary: "#DC143C", secondary: "#FFFFFF", glow: "rgba(220,20,60,0.3)" },
  SUI: { primary: "#DA291C", secondary: "#FFFFFF", glow: "rgba(218,41,28,0.25)" },
  AUT: { primary: "#ED2939", secondary: "#FFFFFF", glow: "rgba(237,41,57,0.25)" },
  DEN: { primary: "#C8102E", secondary: "#FFFFFF", glow: "rgba(200,16,46,0.25)" },
  NOR: { primary: "#EF2B2D", secondary: "#002868", glow: "rgba(239,43,45,0.25)" },
  SCO: { primary: "#0065BD", secondary: "#FFFFFF", glow: "rgba(0,101,189,0.25)" },
  CZE: { primary: "#11457E", secondary: "#D7141A", glow: "rgba(17,69,126,0.25)" },
  BIH: { primary: "#002F6C", secondary: "#FECB00", glow: "rgba(254,203,0,0.25)" },
  TUR: { primary: "#E30A17", secondary: "#FFFFFF", glow: "rgba(227,10,23,0.25)" },
  SWE: { primary: "#006AA7", secondary: "#FECC00", glow: "rgba(254,204,0,0.25)" },

  // AFC
  JPN: { primary: "#BC002D", secondary: "#FFFFFF", glow: "rgba(188,0,45,0.25)" },
  KOR: { primary: "#003478", secondary: "#C60C30", glow: "rgba(198,12,48,0.25)" },
  AUS: { primary: "#FFCD00", secondary: "#00843D", glow: "rgba(255,205,0,0.25)" },
  IRN: { primary: "#239F40", secondary: "#DA0000", glow: "rgba(35,159,64,0.25)" },
  KSA: { primary: "#006C35", secondary: "#FFFFFF", glow: "rgba(0,108,53,0.25)" },
  QAT: { primary: "#8A1538", secondary: "#FFFFFF", glow: "rgba(138,21,56,0.25)" },
  IRQ: { primary: "#CE1126", secondary: "#FFFFFF", glow: "rgba(206,17,38,0.25)" },
  UZB: { primary: "#1EB53A", secondary: "#0099B5", glow: "rgba(30,181,58,0.25)" },
  JOR: { primary: "#000000", secondary: "#CE1126", glow: "rgba(206,17,38,0.25)" },

  // CAF
  MAR: { primary: "#C1272D", secondary: "#006233", glow: "rgba(0,98,51,0.3)" },
  SEN: { primary: "#00853F", secondary: "#FDEF42", glow: "rgba(253,239,66,0.3)" },
  TUN: { primary: "#E70013", secondary: "#FFFFFF", glow: "rgba(231,0,19,0.25)" },
  ALG: { primary: "#006233", secondary: "#D2233C", glow: "rgba(0,98,51,0.25)" },
  EGY: { primary: "#CE1126", secondary: "#000000", glow: "rgba(206,17,38,0.25)" },
  GHA: { primary: "#CE1126", secondary: "#FCD116", glow: "rgba(252,209,22,0.3)" },
  RSA: { primary: "#007749", secondary: "#FFB81C", glow: "rgba(0,119,73,0.3)" },
  NGA: { primary: "#008753", secondary: "#FFFFFF", glow: "rgba(0,135,83,0.3)" },
  CIV: { primary: "#FF8200", secondary: "#009E60", glow: "rgba(255,130,0,0.3)" },
  CPV: { primary: "#003893", secondary: "#CF2027", glow: "rgba(0,56,147,0.25)" },
  COD: { primary: "#007FFF", secondary: "#F7D618", glow: "rgba(0,127,255,0.25)" },

  // OFC
  NZL: { primary: "#012169", secondary: "#FFFFFF", glow: "rgba(1,33,105,0.25)" },
};

const DEFAULT: TeamColor = {
  primary: "#E4002B",
  glow: "rgba(228,0,43,0.2)",
};

export function teamColor(shortCode: string | null | undefined): TeamColor {
  if (!shortCode) return DEFAULT;
  return COLORS[shortCode.toUpperCase()] ?? DEFAULT;
}

/**
 * Generuje gradient pasek + glow box-shadow z dwóch drużyn dla match-glow karty.
 * Zwraca object pasujący do React inline style (jako CSS vars).
 */
export function matchGlowStyle(homeShort: string, awayShort: string): React.CSSProperties {
  const h = teamColor(homeShort);
  const a = teamColor(awayShort);
  return {
    "--team-grad": `linear-gradient(90deg, ${h.primary} 0%, ${h.secondary ?? h.primary} 50%, ${a.primary} 100%)`,
    "--team-glow": h.glow,
  } as React.CSSProperties;
}
