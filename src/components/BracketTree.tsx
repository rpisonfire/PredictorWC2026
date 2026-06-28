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
type Side = "L" | "R";
type Stage = "r16" | "r8" | "qf" | "sf";

const LINE_COLOR = "rgba(241,180,52,0.4)";
const LINE_BORDER = `1.5px solid ${LINE_COLOR}`;
const CONN_W = 26;
const COL_GAP = CONN_W * 2;
const CARD_W = 150;
const CENTER_W = 170;
const ROW_MIN = 82;
const ROWS_PER_SIDE = 8;

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
        <div className="match-tile-inner" style={{ padding: "7px 9px" }}>
          <div className="match-tile-meta" style={{ marginBottom: 3 }}>TBD</div>
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center justify-between" style={{ marginTop: i ? 3 : 0 }}>
              <div className="flex items-center gap-2 min-w-0">
                <span style={{ fontSize: 13, opacity: 0.5 }}>🏳️</span>
                <span className="font-bold truncate" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Courier New', monospace", fontSize: 11 }}>TBD</span>
              </div>
              <span className="font-black" style={{ fontFamily: "'Courier New', monospace", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>-</span>
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
      <div className="match-tile-inner" style={{ padding: "7px 9px" }}>
        <div className="match-tile-meta" style={{ marginBottom: 3 }}>{fmtDateTime(m.kickoff)}</div>
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

// Konwergująca drabinka, slot = jedna karta na danej stronie w danej fazie/rzędzie.
// span po row gridu: r16=1, r8=2, qf=4, sf=8.
// Łącznik prawy (L-shape) idzie w kierunku CENTRUM (right dla L, left dla R).
// Łącznik "wchodzący" (pozioma) z poprzedniej kolumny.
function Slot({
  m, special, side, stage, row, col, connectIn = false, connectOut = false,
}: {
  m: BracketMatch | null;
  special?: Special;
  side: Side;
  stage: Stage;
  row: number;
  col: number;
  connectIn?: boolean;
  connectOut?: boolean;
}) {
  const spanMap: Record<Stage, number> = { r16: 1, r8: 2, qf: 4, sf: 8 };
  const span = spanMap[stage];
  const gridRowStart = row * span + 2; // +2 bo wiersz 1 = nagłówki
  const gridRow = `${gridRowStart} / span ${span}`;
  const isTopOfPair = row % 2 === 0;
  // connectOut: L-shape w kierunku centrum
  const outStyle: React.CSSProperties = side === "L"
    ? {
        right: -CONN_W, width: CONN_W,
        ...(isTopOfPair
          ? { top: "50%", height: "calc(50% + 4px)", borderTop: LINE_BORDER, borderRight: LINE_BORDER, borderTopRightRadius: 8 }
          : { top: -4, height: "calc(50% + 4px)", borderBottom: LINE_BORDER, borderRight: LINE_BORDER, borderBottomRightRadius: 8 }),
      }
    : {
        left: -CONN_W, width: CONN_W,
        ...(isTopOfPair
          ? { top: "50%", height: "calc(50% + 4px)", borderTop: LINE_BORDER, borderLeft: LINE_BORDER, borderTopLeftRadius: 8 }
          : { top: -4, height: "calc(50% + 4px)", borderBottom: LINE_BORDER, borderLeft: LINE_BORDER, borderBottomLeftRadius: 8 }),
      };
  // connectIn: pozioma linia wchodząca z poprzedniej kolumny (od strony przeciwnej do centrum)
  const inStyle: React.CSSProperties = side === "L"
    ? { left: -CONN_W, width: CONN_W, top: "50%", height: 0, borderTop: LINE_BORDER }
    : { right: -CONN_W, width: CONN_W, top: "50%", height: 0, borderTop: LINE_BORDER };
  return (
    <div
      style={{
        gridRow,
        gridColumnStart: col,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3px 0",
      }}
    >
      <div style={{ width: CARD_W, position: "relative" }}>
        <MatchCard m={m} special={special ?? null} />
        {connectIn && <div style={{ position: "absolute", pointerEvents: "none", ...inStyle }} />}
        {connectOut && <div style={{ position: "absolute", pointerEvents: "none", ...outStyle }} />}
      </div>
    </div>
  );
}

export type BracketSlots = {
  r16L: (BracketMatch | null)[]; // 8 top-to-bottom (FIFA: 74,77,73,75,84,83,81,82)
  r8L: (BracketMatch | null)[];  // 4 (89,90,93,94)
  qfL: (BracketMatch | null)[];  // 2 (97,98)
  sfL: (BracketMatch | null)[];  // 1 (101)
  sfR: (BracketMatch | null)[];  // 1 (102)
  qfR: (BracketMatch | null)[];  // 2 (99,100)
  r8R: (BracketMatch | null)[];  // 4 (91,92,95,96)
  r16R: (BracketMatch | null)[]; // 8 (76,78,79,80,86,88,85,87)
  final: BracketMatch | null;
  bronze: BracketMatch | null;
};

export function BracketTree(slots: BracketSlots) {
  // 9 kolumn: r16L | r8L | qfL | sfL | center | sfR | qfR | r8R | r16R
  const headers = [
    { col: 1, label: "1/16" },
    { col: 2, label: "1/8" },
    { col: 3, label: "ĆF" },
    { col: 4, label: "PF" },
    { col: 5, label: "🏆 FINAŁ", final: true },
    { col: 6, label: "PF" },
    { col: 7, label: "ĆF" },
    { col: 8, label: "1/8" },
    { col: 9, label: "1/16" },
  ];

  return (
    <div className="overflow-x-auto -mx-4 px-4 pb-4">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${CARD_W}px ${CARD_W}px ${CARD_W}px ${CARD_W}px ${CENTER_W}px ${CARD_W}px ${CARD_W}px ${CARD_W}px ${CARD_W}px`,
          gridTemplateRows: `auto repeat(${ROWS_PER_SIDE}, minmax(${ROW_MIN}px, 1fr))`,
          columnGap: `${COL_GAP}px`,
          rowGap: 0,
          minWidth: 8 * CARD_W + CENTER_W + 8 * COL_GAP + 32,
        }}
      >
        {headers.map((h) => (
          <div
            key={h.col}
            style={{
              gridRow: 1,
              gridColumnStart: h.col,
              padding: "5px 8px",
              marginBottom: 8,
              borderRadius: 6,
              textAlign: "center",
              fontSize: 10,
              fontWeight: 900,
              textTransform: "uppercase",
              background: h.final
                ? "linear-gradient(180deg, rgba(255,215,0,0.18), rgba(255,165,0,0.06))"
                : "linear-gradient(180deg, #0a0e1a 0%, #050810 100%)",
              color: h.final ? "#FFD700" : "#F1B434",
              fontFamily: "'Courier New', monospace",
              letterSpacing: "2px",
              border: h.final ? "1px solid rgba(255,215,0,0.5)" : "1px solid rgba(241,180,52,0.3)",
              textShadow: h.final ? "0 0 10px rgba(255,215,0,0.6)" : "0 0 6px rgba(241,180,52,0.4)",
              justifySelf: "center",
              alignSelf: "start",
              width: h.final ? CENTER_W : CARD_W,
            }}
          >
            {h.label}
          </div>
        ))}

        {/* LEWA strona */}
        {slots.r16L.map((m, i) => <Slot key={`l16-${i}`} m={m} side="L" stage="r16" row={i} col={1} connectOut />)}
        {slots.r8L.map((m, i) => <Slot key={`l8-${i}`} m={m} side="L" stage="r8" row={i} col={2} connectIn connectOut />)}
        {slots.qfL.map((m, i) => <Slot key={`lqf-${i}`} m={m} side="L" stage="qf" row={i} col={3} connectIn connectOut />)}
        {slots.sfL.map((m, i) => <Slot key={`lsf-${i}`} m={m} side="L" stage="sf" row={i} col={4} connectIn />)}

        {/* PRAWA strona */}
        {slots.sfR.map((m, i) => <Slot key={`rsf-${i}`} m={m} side="R" stage="sf" row={i} col={6} connectIn />)}
        {slots.qfR.map((m, i) => <Slot key={`rqf-${i}`} m={m} side="R" stage="qf" row={i} col={7} connectIn connectOut />)}
        {slots.r8R.map((m, i) => <Slot key={`r8-${i}`} m={m} side="R" stage="r8" row={i} col={8} connectIn connectOut />)}
        {slots.r16R.map((m, i) => <Slot key={`r16-${i}`} m={m} side="R" stage="r16" row={i} col={9} connectOut />)}

        {/* CENTRUM: Finał (rows 2-5) + Brąz (rows 6-9) */}
        <div
          style={{
            gridRow: "2 / span 4",
            gridColumnStart: 5,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 6,
            padding: "4px 0",
          }}
        >
          <div style={{ width: CENTER_W, position: "relative" }}>
            <MatchCard m={slots.final} special="final" />
            <div style={{ position: "absolute", pointerEvents: "none", left: -CONN_W, width: CONN_W, top: "50%", height: 0, borderTop: LINE_BORDER }} />
            <div style={{ position: "absolute", pointerEvents: "none", right: -CONN_W, width: CONN_W, top: "50%", height: 0, borderTop: LINE_BORDER }} />
          </div>
        </div>
        <div
          style={{
            gridRow: "6 / span 4",
            gridColumnStart: 5,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 6,
            padding: "4px 0",
          }}
        >
          <div style={{
            textAlign: "center",
            color: "#CD7F32",
            fontFamily: "'Courier New', monospace",
            letterSpacing: 2,
            textShadow: "0 0 8px rgba(205,127,50,0.5)",
            fontSize: 10,
            fontWeight: 900,
          }}>
            🥉 O 3. MIEJSCE
          </div>
          <div style={{ width: CENTER_W }}>
            <MatchCard m={slots.bronze} special="bronze" />
          </div>
        </div>
      </div>
    </div>
  );
}
