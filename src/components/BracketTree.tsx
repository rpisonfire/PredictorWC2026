import Link from "next/link";
import { Flag } from "./Flag";
import { fmtDateTime } from "@/lib/dates";
import { matchGlowStyle } from "@/lib/teamColors";

export type BracketMatch = {
  id: string;
  kickoff: Date;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: { shortCode: string; flag: string };
  awayTeam: { shortCode: string; flag: string };
};

type Special = "final" | "bronze" | null;

const LINE_COLOR = "rgba(241,180,52,0.35)";
const LINE_BORDER = `1.5px solid ${LINE_COLOR}`;
const GAP_PX = 28; // szerokość obszaru łącznika między kolumnami (połowa odstępu kolumny)
const CARD_W = 168;
const FINAL_COL_W = 184;
const ROW_MIN = 92;

function specialStyle(special: Special) {
  if (special === "final") return { background: "linear-gradient(135deg, #FFD700, #FFA500, #FFD700)", boxShadow: "0 0 30px rgba(255,215,0,0.4)" };
  if (special === "bronze") return { background: "linear-gradient(135deg, #CD7F32, #8B4513, #CD7F32)", boxShadow: "0 0 24px rgba(205,127,50,0.3)" };
  return null;
}

function MatchCard({ m, special = null }: { m: BracketMatch | null; special?: Special }) {
  const sStyle = specialStyle(special);
  if (!m) {
    return (
      <div
        className="match-tile block w-full"
        style={sStyle ?? { background: "linear-gradient(135deg, rgba(241,180,52,0.15), rgba(255,255,255,0.05), rgba(241,180,52,0.15))", opacity: 0.7 }}
      >
        <div className="match-tile-inner" style={{ padding: "8px 10px" }}>
          <div className="match-tile-meta" style={{ marginBottom: 4 }}>TBD</div>
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center justify-between" style={{ marginTop: i ? 4 : 0 }}>
              <div className="flex items-center gap-2 min-w-0">
                <span style={{ fontSize: 14, opacity: 0.5 }}>🏳️</span>
                <span className="font-bold truncate" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Courier New', monospace", fontSize: 12 }}>TBD</span>
              </div>
              <span className="font-black" style={{ fontFamily: "'Courier New', monospace", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>-</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  const finished = m.homeScore !== null && m.awayScore !== null;
  const homeWon = finished && m.homeScore! > m.awayScore!;
  const awayWon = finished && m.awayScore! > m.homeScore!;
  const style = sStyle ?? matchGlowStyle(m.homeTeam.shortCode, m.awayTeam.shortCode);
  return (
    <Link href={`/match/${m.id}`} prefetch={false} className="match-tile block w-full" style={style}>
      <div className="match-tile-inner" style={{ padding: "8px 10px" }}>
        <div className="match-tile-meta" style={{ marginBottom: 4 }}>{fmtDateTime(m.kickoff)}</div>
        <div className={`flex items-center justify-between ${awayWon ? "opacity-50" : ""}`}>
          <div className="flex items-center gap-2 min-w-0">
            <Flag emoji={m.homeTeam.flag} size="sm" />
            <span className="font-bold truncate text-xs" style={{ color: homeWon ? "#F1B434" : "white" }}>{m.homeTeam.shortCode}</span>
          </div>
          <span className="font-black text-sm" style={{ fontFamily: "'Courier New', monospace", color: homeWon ? "#F1B434" : "white" }}>{m.homeScore ?? "-"}</span>
        </div>
        <div className={`flex items-center justify-between mt-1 ${homeWon ? "opacity-50" : ""}`}>
          <div className="flex items-center gap-2 min-w-0">
            <Flag emoji={m.awayTeam.flag} size="sm" />
            <span className="font-bold truncate text-xs" style={{ color: awayWon ? "#F1B434" : "white" }}>{m.awayTeam.shortCode}</span>
          </div>
          <span className="font-black text-sm" style={{ fontFamily: "'Courier New', monospace", color: awayWon ? "#F1B434" : "white" }}>{m.awayScore ?? "-"}</span>
        </div>
      </div>
    </Link>
  );
}

// Slot zajmuje N wierszy grida - karta wyśrodkowana pionowo.
// Łączniki: pseudo-divy absolutne wystające w gap między kolumnami.
function Slot({
  m, special, stage, row, side, connectLeft = false, connectRight = false,
}: {
  m: BracketMatch | null;
  special?: Special;
  stage: "r16" | "r8" | "qf" | "sf";
  row: number;
  side: "L" | "R";
  connectLeft?: boolean;
  connectRight?: boolean;
}) {
  const spanMap = { r16: 1, r8: 2, qf: 4, sf: 8 };
  const span = spanMap[stage];
  // +2 zamiast +1 bo wiersz 1 zajmują nagłówki kolumn
  const gridRow = `${row * span + 2} / span ${span}`;
  // W każdej kolumnie pary: row even = TOP, row odd = BOTTOM.
  // Midpoint pary = boundary między slot row N i N+1.
  const isTopOfPair = row % 2 === 0;
  const corner = side === "L" ? {
    // Łącznik na PRAWO od karty - jadący do col k+1 (parent)
    right: -GAP_PX, width: GAP_PX,
    ...(isTopOfPair
      ? { top: "50%", height: "50%", borderTop: LINE_BORDER, borderRight: LINE_BORDER, borderTopRightRadius: 8 }
      : { top: 0, height: "50%", borderBottom: LINE_BORDER, borderRight: LINE_BORDER, borderBottomRightRadius: 8 }),
  } : {
    left: -GAP_PX, width: GAP_PX,
    ...(isTopOfPair
      ? { top: "50%", height: "50%", borderTop: LINE_BORDER, borderLeft: LINE_BORDER, borderTopLeftRadius: 8 }
      : { top: 0, height: "50%", borderBottom: LINE_BORDER, borderLeft: LINE_BORDER, borderBottomLeftRadius: 8 }),
  };
  // Łącznik wchodzący z poprzedniej kolumny (k-1 dla L, k+1 dla R)
  // Pozioma linia w pół wysokości karty.
  const incoming = side === "L" ? {
    left: -GAP_PX, width: GAP_PX, top: "50%", height: 0, borderTop: LINE_BORDER,
  } : {
    right: -GAP_PX, width: GAP_PX, top: "50%", height: 0, borderTop: LINE_BORDER,
  };
  const colKey = side === "L" ? `l-${stage}` : `r-${stage}`;
  return (
    <div
      style={{
        gridRow,
        gridColumnStart: `var(--col-${colKey})` as unknown as number,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px 0",
      }}
    >
      <div style={{ width: CARD_W, position: "relative" }}>
        <MatchCard m={m} special={special ?? null} />
        {connectRight && <div style={{ position: "absolute", pointerEvents: "none", ...corner }} />}
        {connectLeft && <div style={{ position: "absolute", pointerEvents: "none", ...incoming }} />}
      </div>
    </div>
  );
}

function ColumnHeader({ label, colKey }: { label: string; colKey: string }) {
  return (
    <div
      style={{
        gridRow: "header",
        gridColumnStart: `var(--col-${colKey})` as unknown as number,
        padding: "6px 8px",
        marginBottom: 6,
        borderRadius: 6,
        textAlign: "center",
        fontSize: 10,
        fontWeight: 900,
        textTransform: "uppercase",
        background: "linear-gradient(180deg, #0a0e1a 0%, #050810 100%)",
        color: "#F1B434",
        fontFamily: "'Courier New', monospace",
        letterSpacing: "2px",
        border: "1px solid rgba(241,180,52,0.3)",
        textShadow: "0 0 6px rgba(241,180,52,0.4)",
        justifySelf: "center",
        width: CARD_W,
      }}
    >
      {label}
    </div>
  );
}

export type BracketSlots = {
  r16L: (BracketMatch | null)[];
  r8L: (BracketMatch | null)[];
  qfL: (BracketMatch | null)[];
  sfL: (BracketMatch | null)[];
  sfR: (BracketMatch | null)[];
  qfR: (BracketMatch | null)[];
  r8R: (BracketMatch | null)[];
  r16R: (BracketMatch | null)[];
  final: BracketMatch | null;
  bronze: BracketMatch | null;
};

export function BracketTree(slots: BracketSlots) {
  // Grid: 9 kolumn (4L + center + 4R) × 8 wierszy + header
  // Kolumny: r16L | r8L | qfL | sfL | center | sfR | qfR | r8R | r16R
  // CSS var dla łatwego referowania
  const containerStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `${CARD_W}px ${CARD_W}px ${CARD_W}px ${CARD_W}px ${FINAL_COL_W}px ${CARD_W}px ${CARD_W}px ${CARD_W}px ${CARD_W}px`,
    gridTemplateRows: `auto repeat(8, minmax(${ROW_MIN}px, 1fr))`,
    gridTemplateAreas: `"header"`,
    columnGap: `${GAP_PX * 2}px`,
    rowGap: 0,
    ["--col-l-r16" as never]: 1,
    ["--col-l-r8" as never]: 2,
    ["--col-l-qf" as never]: 3,
    ["--col-l-sf" as never]: 4,
    ["--col-center" as never]: 5,
    ["--col-r-sf" as never]: 6,
    ["--col-r-qf" as never]: 7,
    ["--col-r-r8" as never]: 8,
    ["--col-r-r16" as never]: 9,
  };
  // Wrap nagłówków - wymaga grid-template-rows pierwszy = auto.
  // Łatwiej: zrobić header jako osobny grid row "1" i przesunąć sloty od row 2.

  return (
    <div className="hidden md:block">
      <div style={containerStyle}>
        {/* Nagłówki kolumn (grid-row 1 = auto) */}
        {(["l-r16","l-r8","l-qf","l-sf","center","r-sf","r-qf","r-r8","r-r16"] as const).map((k) => {
          const label = k === "center" ? "🏆" : k.endsWith("r16") ? "1/16" : k.endsWith("r8") ? "1/8" : k.endsWith("qf") ? "ĆF" : "PF";
          return (
            <div
              key={k}
              style={{
                gridRow: 1,
                gridColumnStart: `var(--col-${k})` as unknown as number,
                padding: "6px 8px",
                marginBottom: 8,
                borderRadius: 6,
                textAlign: "center",
                fontSize: 10,
                fontWeight: 900,
                textTransform: "uppercase",
                background: k === "center"
                  ? "linear-gradient(180deg, rgba(255,215,0,0.15), rgba(255,165,0,0.05))"
                  : "linear-gradient(180deg, #0a0e1a 0%, #050810 100%)",
                color: k === "center" ? "#FFD700" : "#F1B434",
                fontFamily: "'Courier New', monospace",
                letterSpacing: "2px",
                border: k === "center" ? "1px solid rgba(255,215,0,0.5)" : "1px solid rgba(241,180,52,0.3)",
                textShadow: k === "center" ? "0 0 10px rgba(255,215,0,0.6)" : "0 0 6px rgba(241,180,52,0.4)",
                justifySelf: "center",
                alignSelf: "start",
                width: k === "center" ? FINAL_COL_W - 8 : CARD_W,
              }}
            >
              {label}
            </div>
          );
        })}

        {/* Sloty - row prop = pozycja w kolumnie, gridRow przesunięty o +1 bo nagłówki w row 1 */}
        {slots.r16L.map((m, i) => <SlotShifted key={`l16-${i}`} m={m} stage="r16" row={i} side="L" connectRight />)}
        {slots.r8L.map((m, i) => <SlotShifted key={`l8-${i}`} m={m} stage="r8" row={i} side="L" connectLeft connectRight />)}
        {slots.qfL.map((m, i) => <SlotShifted key={`lq-${i}`} m={m} stage="qf" row={i} side="L" connectLeft connectRight />)}
        {slots.sfL.map((m, i) => <SlotShifted key={`ls-${i}`} m={m} stage="sf" row={i} side="L" connectLeft />)}

        {slots.sfR.map((m, i) => <SlotShifted key={`rs-${i}`} m={m} stage="sf" row={i} side="R" connectLeft />)}
        {slots.qfR.map((m, i) => <SlotShifted key={`rq-${i}`} m={m} stage="qf" row={i} side="R" connectLeft connectRight />)}
        {slots.r8R.map((m, i) => <SlotShifted key={`r8-${i}`} m={m} stage="r8" row={i} side="R" connectLeft connectRight />)}
        {slots.r16R.map((m, i) => <SlotShifted key={`r16-${i}`} m={m} stage="r16" row={i} side="R" connectRight />)}

        {/* Centrum: Finał (góra połowa) + Brąz (dół połowa) */}
        <div
          style={{
            gridRow: "2 / span 4",
            gridColumnStart: `var(--col-center)` as unknown as number,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ color: "#FFD700", fontFamily: "'Courier New', monospace", letterSpacing: 3, textShadow: "0 0 12px rgba(255,215,0,0.6)", fontSize: 12, fontWeight: 900 }}>🏆 FINAŁ</div>
          <div style={{ width: FINAL_COL_W - 16, position: "relative" }}>
            <MatchCard m={slots.final} special="final" />
            {/* Linie wchodzące od PF L i PF R */}
            <div style={{ position: "absolute", pointerEvents: "none", left: -GAP_PX, width: GAP_PX, top: "50%", height: 0, borderTop: LINE_BORDER }} />
            <div style={{ position: "absolute", pointerEvents: "none", right: -GAP_PX, width: GAP_PX, top: "50%", height: 0, borderTop: LINE_BORDER }} />
          </div>
        </div>
        <div
          style={{
            gridRow: "6 / span 4",
            gridColumnStart: `var(--col-center)` as unknown as number,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 6,
          }}
        >
          <div style={{ color: "#CD7F32", fontFamily: "'Courier New', monospace", letterSpacing: 2, textShadow: "0 0 8px rgba(205,127,50,0.5)", fontSize: 10, fontWeight: 900 }}>🥉 O 3. MIEJSCE</div>
          <div style={{ width: FINAL_COL_W - 16 }}>
            <MatchCard m={slots.bronze} special="bronze" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Alias - Slot już bierze pod uwagę offset nagłówków (+2 w gridRow)
const SlotShifted = Slot;
