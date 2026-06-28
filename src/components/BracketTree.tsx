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

// cards[row] - mapowanie row -> match (lub null jeśli para jeszcze nieznana).
// Karty równomiernie rozłożone pionowo przez justify-around, dzięki czemu
// para z poprzedniej kolumny wpada na pozycję jednej karty w kolejnej.
function Column({
  label,
  cards,
  width = 175,
}: {
  label: string;
  cards: (BracketMatch | null)[];
  width?: number;
}) {
  return (
    <div className="flex flex-col h-full" style={{ width, flexShrink: 0 }}>
      <div
        className="py-1.5 px-2 mb-2 rounded-md text-[10px] uppercase font-black text-center"
        style={{
          background: "linear-gradient(180deg, #0a0e1a 0%, #050810 100%)",
          color: "#F1B434",
          fontFamily: "'Courier New', monospace",
          letterSpacing: "2px",
          border: "1px solid rgba(241,180,52,0.3)",
          textShadow: "0 0 6px rgba(241,180,52,0.4)",
        }}
      >
        {label}
      </div>
      <div className="flex flex-col flex-1 justify-around gap-2">
        {cards.map((m, i) => (
          <MatchCard key={m?.id ?? `slot-${i}`} m={m} />
        ))}
      </div>
    </div>
  );
}

// Każde z pól to tablica indeksowana przez row (top-to-bottom) wg wc2026Bracket.
export type BracketSlots = {
  r16L: (BracketMatch | null)[]; // 8
  r8L: (BracketMatch | null)[];  // 4
  qfL: (BracketMatch | null)[];  // 2
  sfL: (BracketMatch | null)[];  // 1
  sfR: (BracketMatch | null)[];  // 1
  qfR: (BracketMatch | null)[];  // 2
  r8R: (BracketMatch | null)[];  // 4
  r16R: (BracketMatch | null)[]; // 8
  final: BracketMatch | null;
  bronze: BracketMatch | null;
};

export function BracketTree(slots: BracketSlots) {
  return (
    <div className="hidden md:flex gap-3 items-stretch" style={{ minHeight: 760 }}>
      <Column label="1/16" cards={slots.r16L} />
      <Column label="1/8" cards={slots.r8L} />
      <Column label="ĆF" cards={slots.qfL} />
      <Column label="PF" cards={slots.sfL} />

      {/* Centrum: Final + brąz */}
      <div className="flex flex-col items-center justify-center gap-3 px-2" style={{ width: 200, flexShrink: 0 }}>
        <div
          className="text-center"
          style={{
            color: "#FFD700",
            fontFamily: "'Courier New', monospace",
            letterSpacing: "3px",
            textShadow: "0 0 12px rgba(255,215,0,0.6)",
            fontSize: 12,
            fontWeight: 900,
          }}
        >
          🏆 FINAŁ
        </div>
        <div className="w-full"><MatchCard m={slots.final} special="final" /></div>
        <div
          className="text-center mt-3"
          style={{
            color: "#CD7F32",
            fontFamily: "'Courier New', monospace",
            letterSpacing: "2px",
            textShadow: "0 0 8px rgba(205,127,50,0.5)",
            fontSize: 10,
            fontWeight: 900,
          }}
        >
          🥉 O 3. MIEJSCE
        </div>
        <div className="w-full"><MatchCard m={slots.bronze} special="bronze" /></div>
      </div>

      <Column label="PF" cards={slots.sfR} />
      <Column label="ĆF" cards={slots.qfR} />
      <Column label="1/8" cards={slots.r8R} />
      <Column label="1/16" cards={slots.r16R} />
    </div>
  );
}
