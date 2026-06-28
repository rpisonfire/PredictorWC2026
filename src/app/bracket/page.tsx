import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { fmtDateTime } from "@/lib/dates";
import { Flag } from "@/components/Flag";
import { matchGlowStyle } from "@/lib/teamColors";
import { prettyStage } from "@/lib/stageLabel";
import { BracketTree, type BracketMatch, type BracketSlots } from "@/components/BracketTree";
import { BRACKET_SLOTS, STAGE_FIRST_MATCH, bracketStageFromLabel, type BracketStage } from "@/lib/wc2026Bracket";

// Cache 5 min - po fazie grupowej awansowanie + lock typu mistrza ma znaczenie.
// Cron + admin invaliduje natychmiast po sync.
export const revalidate = 300;

const STAGE_ORDER = [
  "Faza grupowa",
  "1/16 finału",
  "1/8 finału",
  "Ćwierćfinał",
  "Półfinał",
  "Mecz o 3. miejsce",
  "Finał",
];

const COLUMN_LABEL: Record<string, string> = {
  "1/16 finału": "1/16",
  "1/8 finału": "1/8",
  "Ćwierćfinał": "Ćwierćfinały",
  "Półfinał": "Półfinały",
  "Mecz o 3. miejsce": "O 3. miejsce",
  "Finał": "Finał",
};

// Spodziewane ilości meczy per etap (Mundial 2026 = 32 drużyny w 1/16)
const EXPECTED_COUNTS: Record<string, number> = {
  "1/16 finału": 16,
  "1/8 finału": 8,
  "Ćwierćfinał": 4,
  "Półfinał": 2,
  "Mecz o 3. miejsce": 1,
  "Finał": 1,
};

export default async function BracketPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Bierz wszystkie mecze nie-grupowe (włącznie z surowymi stage'ami jeśli sync jeszcze nie zaktualizował)
  const matches = await prisma.match.findMany({
    where: { NOT: { stage: { startsWith: "Grupa" } } },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoff: "asc" },
  });

  // group by stage (z defensywnym remappingiem gdy DB ma surowe stage'y)
  const byStage = new Map<string, typeof matches>();
  for (const m of matches) {
    const stage = prettyStage(m.stage);
    const arr = byStage.get(stage) ?? [];
    arr.push(m);
    byStage.set(stage, arr);
  }

  // Pokaż WSZYSTKIE etapy - nawet bez meczy w bazie (jako placeholders)
  const stages = STAGE_ORDER.filter((s) => s !== "Faza grupowa");
  const hasAnyMatches = matches.length > 0;

  return (
    <section>
      <h1 className="text-3xl font-black mb-1">Drabinka pucharowa 🏆</h1>
      <p className="text-app-muted mb-6">
        {hasAnyMatches
          ? "Wszystkie mecze fazy pucharowej. Pary awansowe pojawią się po zakończeniu fazy grupowej."
          : "Struktura drabinki Mundialu 2026. Pary pojawią się po zakończeniu fazy grupowej i synchronizacji z football-data.org."}
      </p>

      {/* Desktop: konwergująca drabinka FIFA z prawdziwym pairingiem (M73-M104) */}
      {(() => {
        // Inicjalizacja pustych slotów
        const empty = (n: number) => Array.from({ length: n }, () => null as BracketMatch | null);
        const slots: BracketSlots = {
          r16L: empty(8), r16R: empty(8),
          r8L: empty(4), r8R: empty(4),
          qfL: empty(2), qfR: empty(2),
          sfL: empty(1), sfR: empty(1),
          final: null, bronze: null,
        };
        // Dla każdej fazy mapuj posortowane po kickoff mecze na numery M73.. wg offsetu
        const fillStage = (stage: BracketStage, list: typeof matches) => {
          const first = STAGE_FIRST_MATCH[stage];
          list.forEach((m, idx) => {
            const num = first + idx;
            const slot = BRACKET_SLOTS.find((s) => s.matchNumber === num);
            if (!slot) return;
            const cast = m as unknown as BracketMatch;
            if (slot.stage === "final") slots.final = cast;
            else if (slot.stage === "bronze") slots.bronze = cast;
            else {
              const key = `${slot.stage}${slot.side}` as keyof BracketSlots;
              (slots[key] as (BracketMatch | null)[])[slot.row] = cast;
            }
          });
        };
        // Każdą fazę z DB wrzuć osobno (sortowanie kickoff już z query)
        for (const [label, list] of byStage.entries()) {
          const stage = bracketStageFromLabel(label);
          if (stage) fillStage(stage, list);
        }
        return <BracketTree {...slots} />;
      })()}

      {/* Mobile: horizontal scroll po kolumnach */}
      <div className="md:hidden overflow-x-auto -mx-4 px-4">
          <div className="flex gap-4 min-w-max">
            {stages.map((s) => {
              const list = byStage.get(s) ?? [];
              const expected = EXPECTED_COUNTS[s] ?? 0;
              const placeholders = Math.max(0, expected - list.length);
              const isFinal = s === "Finał";
              const isBronze = s === "Mecz o 3. miejsce";
              const headerEmoji = isFinal ? "🏆 " : isBronze ? "🥉 " : "";
              const headerColor = isFinal ? "#FFD700" : isBronze ? "#CD7F32" : "#F1B434";
              const headerBorder = isFinal ? "rgba(255,215,0,0.6)" : isBronze ? "rgba(205,127,50,0.6)" : "rgba(241,180,52,0.3)";
              const headerGlow = isFinal ? "0 0 12px rgba(255,215,0,0.5)" : isBronze ? "0 0 10px rgba(205,127,50,0.5)" : "0 0 6px rgba(241,180,52,0.4)";
              return (
                <div key={s} className="flex flex-col gap-3 min-w-[240px]">
                  <div className="sticky top-0 z-10 py-2 px-3 rounded-lg text-xs uppercase tracking-wider font-black"
                       style={{
                         background: "linear-gradient(180deg, #0a0e1a 0%, #050810 100%)",
                         color: headerColor,
                         fontFamily: "'Courier New', monospace",
                         letterSpacing: "2px",
                         border: `1px solid ${headerBorder}`,
                         textShadow: headerGlow,
                       }}>
                    {headerEmoji}{COLUMN_LABEL[s] ?? s} · {expected}
                  </div>
                  <div className="flex flex-col gap-3 justify-around flex-1">
                    {/* Placeholder TBD sloty - gdy brak meczy w bazie */}
                    {Array.from({ length: placeholders }).map((_, i) => (
                      <div
                        key={`tbd-${i}`}
                        className="match-tile block"
                        style={{
                          background: isFinal
                            ? "linear-gradient(135deg, #FFD700, #FFA500, #FFD700)"
                            : isBronze
                            ? "linear-gradient(135deg, #CD7F32, #8B4513, #CD7F32)"
                            : "linear-gradient(135deg, rgba(241,180,52,0.15), rgba(255,255,255,0.05), rgba(241,180,52,0.15))",
                          opacity: isFinal || isBronze ? 0.9 : 0.7,
                          boxShadow: isFinal
                            ? "0 0 30px rgba(255,215,0,0.4)"
                            : isBronze
                            ? "0 0 24px rgba(205,127,50,0.3)"
                            : undefined,
                        }}
                      >
                        <div className="match-tile-inner" style={{ padding: "10px 12px" }}>
                          <div className="match-tile-meta" style={{ marginBottom: 4 }}>TBD</div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <span style={{ fontSize: 16, opacity: 0.5 }}>🏳️</span>
                              <span className="font-bold truncate" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Courier New', monospace" }}>TBD</span>
                            </div>
                            <span className="font-black text-lg" style={{ fontFamily: "'Courier New', monospace", color: "rgba(255,255,255,0.3)" }}>—</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span style={{ fontSize: 16, opacity: 0.5 }}>🏳️</span>
                              <span className="font-bold truncate" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Courier New', monospace" }}>TBD</span>
                            </div>
                            <span className="font-black text-lg" style={{ fontFamily: "'Courier New', monospace", color: "rgba(255,255,255,0.3)" }}>—</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {list.map((m) => {
                      const finished = m.homeScore !== null && m.awayScore !== null;
                      const homeWon = finished && m.homeScore! > m.awayScore!;
                      const awayWon = finished && m.awayScore! > m.homeScore!;
                      const specialStyle = isFinal
                        ? { background: "linear-gradient(135deg, #FFD700, #FFA500, #FFD700)", boxShadow: "0 0 30px rgba(255,215,0,0.4)" }
                        : isBronze
                        ? { background: "linear-gradient(135deg, #CD7F32, #8B4513, #CD7F32)", boxShadow: "0 0 24px rgba(205,127,50,0.3)" }
                        : matchGlowStyle(m.homeTeam.shortCode, m.awayTeam.shortCode);
                      return (
                        <Link
                          key={m.id}
                          href={`/match/${m.id}`}
                          prefetch={false}
                          className="match-tile block"
                          style={specialStyle}
                        >
                          <div className="match-tile-inner" style={{ padding: "10px 12px" }}>
                            <div className="match-tile-meta" style={{ marginBottom: 4 }}>{fmtDateTime(m.kickoff)}</div>
                            <div className={`flex items-center justify-between ${awayWon ? "opacity-50" : ""}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <Flag emoji={m.homeTeam.flag} size="sm" />
                                <span className="font-bold truncate" style={{ color: homeWon ? "#F1B434" : "white" }}>{m.homeTeam.shortCode}</span>
                              </div>
                              <span className="font-black text-lg" style={{ fontFamily: "'Courier New', monospace", color: homeWon ? "#F1B434" : "white", textShadow: homeWon ? "0 0 6px rgba(241,180,52,0.4)" : "none" }}>
                                {m.homeScore ?? "-"}
                              </span>
                            </div>
                            <div className={`flex items-center justify-between mt-1 ${homeWon ? "opacity-50" : ""}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <Flag emoji={m.awayTeam.flag} size="sm" />
                                <span className="font-bold truncate" style={{ color: awayWon ? "#F1B434" : "white" }}>{m.awayTeam.shortCode}</span>
                              </div>
                              <span className="font-black text-lg" style={{ fontFamily: "'Courier New', monospace", color: awayWon ? "#F1B434" : "white", textShadow: awayWon ? "0 0 6px rgba(241,180,52,0.4)" : "none" }}>
                                {m.awayScore ?? "-"}
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
    </section>
  );
}
