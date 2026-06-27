import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { fmtDateTime } from "@/lib/dates";
import { Flag } from "@/components/Flag";
import { matchGlowStyle } from "@/lib/teamColors";

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

  // Re-map surowych stage'ów do polskich (awaryjny defensywny mapping gdy DB ma stare)
  const STAGE_REMAP: Record<string, string> = {
    "LAST_32": "1/16 finału",
    "LAST_16": "1/8 finału",
    "QUARTER_FINALS": "Ćwierćfinał",
    "SEMI_FINALS": "Półfinał",
    "THIRD_PLACE": "Mecz o 3. miejsce",
    "FINAL": "Finał",
  };

  // group by stage (z remappingiem)
  const byStage = new Map<string, typeof matches>();
  for (const m of matches) {
    const stage = STAGE_REMAP[m.stage] ?? m.stage;
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

      <div className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-4 min-w-max">
            {stages.map((s) => {
              const list = byStage.get(s) ?? [];
              const expected = EXPECTED_COUNTS[s] ?? 0;
              const placeholders = Math.max(0, expected - list.length);
              return (
                <div key={s} className="flex flex-col gap-3 min-w-[240px]">
                  <div className="sticky top-0 z-10 py-2 px-3 rounded-lg text-xs uppercase tracking-wider font-black"
                       style={{
                         background: "linear-gradient(180deg, #0a0e1a 0%, #050810 100%)",
                         color: "#F1B434",
                         fontFamily: "'Courier New', monospace",
                         letterSpacing: "2px",
                         border: "1px solid rgba(241,180,52,0.3)",
                         textShadow: "0 0 6px rgba(241,180,52,0.4)",
                       }}>
                    {COLUMN_LABEL[s] ?? s} · {expected}
                  </div>
                  <div className="flex flex-col gap-3 justify-around flex-1">
                    {/* Placeholder TBD sloty - gdy brak meczy w bazie */}
                    {Array.from({ length: placeholders }).map((_, i) => (
                      <div
                        key={`tbd-${i}`}
                        className="match-tile block"
                        style={{ background: "linear-gradient(135deg, rgba(241,180,52,0.15), rgba(255,255,255,0.05), rgba(241,180,52,0.15))", opacity: 0.7 }}
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
                      return (
                        <Link
                          key={m.id}
                          href={`/match/${m.id}`}
                          prefetch={false}
                          className="match-tile block"
                          style={matchGlowStyle(m.homeTeam.shortCode, m.awayTeam.shortCode)}
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
