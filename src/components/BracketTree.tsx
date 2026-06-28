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

const LINE_COLOR = "rgba(241,180,52,0.4)";
const LINE_BORDER = `1.5px solid ${LINE_COLOR}`;
const CONN_W = 32; // szerokość obszaru łącznika (połowa column-gap)
const COL_GAP = CONN_W * 2;
const CARD_W = 156;
const ROW_MIN = 84;
const ROWS_TOTAL = 16; // 1/16 ma 16 slotów

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

// Pojedyncza karta w drzewie lewo->prawo.
// - col: 1=r16, 2=r8, 3=qf, 4=pf, 5=final
// - row: index w kolumnie (od 0 top, do N-1 bottom)
// - span: ile wierszy gridu zajmuje (1,2,4,8,16)
// - connectRight: rysuj L-shape do prawej (chyba że ostatnia kolumna)
// - connectLeft: rysuj poziomą wchodzącą z lewej (chyba że pierwsza kolumna)
function Slot({
  m, special, col, row, span, connectLeft = false, connectRight = false, isFinalCol = false,
}: {
  m: BracketMatch | null;
  special?: Special;
  col: number;
  row: number;
  span: number;
  connectLeft?: boolean;
  connectRight?: boolean;
  isFinalCol?: boolean;
}) {
  // gridRow: +2 bo wiersz 1 to nagłówki
  const gridRowStart = row * span + 2;
  const gridRow = `${gridRowStart} / span ${span}`;
  // W każdej kolumnie pary: row parzysty = TOP pary, nieparzysty = BOTTOM
  const isTopOfPair = row % 2 === 0;
  return (
    <div
      style={{
        gridRow,
        gridColumnStart: col,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px 0",
      }}
    >
      <div style={{ width: isFinalCol ? CARD_W + 12 : CARD_W, position: "relative" }}>
        <MatchCard m={m} special={special ?? null} />
        {/* Lewy łącznik - pozioma linia wchodząca z poprzedniej kolumny */}
        {connectLeft && (
          <div style={{
            position: "absolute", pointerEvents: "none",
            left: -CONN_W, width: CONN_W, top: "50%", height: 0,
            borderTop: LINE_BORDER,
          }} />
        )}
        {/* Prawy łącznik L-shape - pozioma od karty + pionowa do midpointu pary */}
        {connectRight && (
          <div style={{
            position: "absolute", pointerEvents: "none",
            right: -CONN_W, width: CONN_W,
            ...(isTopOfPair
              ? { top: "50%", height: "calc(50% + 4px)", borderTop: LINE_BORDER, borderRight: LINE_BORDER, borderTopRightRadius: 8 }
              : { top: -4, height: "calc(50% + 4px)", borderBottom: LINE_BORDER, borderRight: LINE_BORDER, borderBottomRightRadius: 8 }
            ),
          }} />
        )}
      </div>
    </div>
  );
}

export type BracketSlots = {
  r16: (BracketMatch | null)[]; // 16, top-to-bottom wg TREE_ROW_ORDER
  r8: (BracketMatch | null)[];  // 8
  qf: (BracketMatch | null)[];  // 4
  sf: (BracketMatch | null)[];  // 2 (PF)
  final: BracketMatch | null;
  bronze: BracketMatch | null;
};

export function BracketTree(slots: BracketSlots) {
  const headerLabels: { col: number; label: string }[] = [
    { col: 1, label: "1/16" },
    { col: 2, label: "1/8" },
    { col: 3, label: "ĆF" },
    { col: 4, label: "PF" },
    { col: 5, label: "🏆 FINAŁ" },
  ];

  return (
    <div className="overflow-x-auto -mx-4 px-4 pb-4">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${CARD_W}px ${CARD_W}px ${CARD_W}px ${CARD_W}px ${CARD_W + 12}px`,
          gridTemplateRows: `auto repeat(${ROWS_TOTAL}, minmax(${ROW_MIN}px, 1fr))`,
          columnGap: `${COL_GAP}px`,
          rowGap: 0,
          minWidth: 5 * CARD_W + 12 + 4 * COL_GAP + 32,
        }}
      >
        {headerLabels.map((h) => (
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
              background: h.col === 5
                ? "linear-gradient(180deg, rgba(255,215,0,0.18), rgba(255,165,0,0.06))"
                : "linear-gradient(180deg, #0a0e1a 0%, #050810 100%)",
              color: h.col === 5 ? "#FFD700" : "#F1B434",
              fontFamily: "'Courier New', monospace",
              letterSpacing: "2px",
              border: h.col === 5 ? "1px solid rgba(255,215,0,0.5)" : "1px solid rgba(241,180,52,0.3)",
              textShadow: h.col === 5 ? "0 0 10px rgba(255,215,0,0.6)" : "0 0 6px rgba(241,180,52,0.4)",
              justifySelf: "center",
              alignSelf: "start",
              width: h.col === 5 ? CARD_W + 12 : CARD_W,
            }}
          >
            {h.label}
          </div>
        ))}

        {slots.r16.map((m, i) => (
          <Slot key={`r16-${i}`} m={m} col={1} row={i} span={1} connectRight />
        ))}
        {slots.r8.map((m, i) => (
          <Slot key={`r8-${i}`} m={m} col={2} row={i} span={2} connectLeft connectRight />
        ))}
        {slots.qf.map((m, i) => (
          <Slot key={`qf-${i}`} m={m} col={3} row={i} span={4} connectLeft connectRight />
        ))}
        {slots.sf.map((m, i) => (
          <Slot key={`sf-${i}`} m={m} col={4} row={i} span={8} connectLeft connectRight />
        ))}
        <Slot m={slots.final} special="final" col={5} row={0} span={16} connectLeft isFinalCol />
      </div>

      {/* Brąz - osobna sekcja pod drzewem, wycentrowana */}
      <div className="mt-6 flex justify-center">
        <div style={{ width: CARD_W + 12 }}>
          <div style={{
            textAlign: "center",
            color: "#CD7F32",
            fontFamily: "'Courier New', monospace",
            letterSpacing: 2,
            textShadow: "0 0 8px rgba(205,127,50,0.5)",
            fontSize: 10,
            fontWeight: 900,
            marginBottom: 6,
          }}>
            🥉 O 3. MIEJSCE
          </div>
          <MatchCard m={slots.bronze} special="bronze" />
        </div>
      </div>
    </div>
  );
}
