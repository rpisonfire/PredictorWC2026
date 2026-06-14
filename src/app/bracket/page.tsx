import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { fmtDateTime } from "@/lib/dates";
import { Flag } from "@/components/Flag";

// Drabinka zmienia się rzadko - cache 30 min, admin invaliduje po wpisaniu wyniku.
export const revalidate = 1800;

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

export default async function BracketPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const matches = await prisma.match.findMany({
    where: { stage: { in: STAGE_ORDER.filter((s) => s !== "Faza grupowa") } },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoff: "asc" },
  });

  // group by stage
  const byStage = new Map<string, typeof matches>();
  for (const m of matches) {
    const arr = byStage.get(m.stage) ?? [];
    arr.push(m);
    byStage.set(m.stage, arr);
  }

  const stages = STAGE_ORDER.filter((s) => s !== "Faza grupowa" && byStage.has(s));

  return (
    <section>
      <h1 className="text-3xl font-black mb-1">Drabinka pucharowa 🏆</h1>
      <p className="text-app-muted mb-6">Wszystkie mecze fazy pucharowej. Pary awansowe pojawią się po zakończeniu fazy grupowej.</p>

      {stages.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-5xl mb-3">🌳</div>
          <div className="font-bold">Drabinka jeszcze pusta</div>
          <p className="text-sm text-app-subtle mt-1">Mecze pucharowe pojawią się po fazie grupowej.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-4 min-w-max">
            {stages.map((s) => {
              const list = byStage.get(s) ?? [];
              return (
                <div key={s} className="flex flex-col gap-3 min-w-[240px]">
                  <div className="text-xs uppercase tracking-wider text-app-subtle sticky top-0 bg-[var(--header-bg)] backdrop-blur py-2 px-3 rounded-lg">
                    {COLUMN_LABEL[s] ?? s} · {list.length}
                  </div>
                  <div className="flex flex-col gap-3 justify-around flex-1">
                    {list.map((m) => {
                      const finished = m.homeScore !== null && m.awayScore !== null;
                      const homeWon = finished && m.homeScore! > m.awayScore!;
                      const awayWon = finished && m.awayScore! > m.homeScore!;
                      return (
                        <a
                          key={m.id}
                          href={`/match/${m.id}`}
                          className="card p-3 hover:border-wc-red/40 transition block"
                        >
                          <div className="text-[10px] text-app-subtle">{fmtDateTime(m.kickoff)}</div>
                          <div className={`flex items-center justify-between mt-1 ${awayWon ? "opacity-50" : ""}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <Flag emoji={m.homeTeam.flag} size="sm" />
                              <span className={`font-bold truncate ${homeWon ? "text-wc-gold" : ""}`}>{m.homeTeam.shortCode}</span>
                            </div>
                            <span className={`font-black text-lg tabular-nums ${homeWon ? "text-wc-gold" : ""}`}>{m.homeScore ?? "-"}</span>
                          </div>
                          <div className={`flex items-center justify-between mt-1 ${homeWon ? "opacity-50" : ""}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <Flag emoji={m.awayTeam.flag} size="sm" />
                              <span className={`font-bold truncate ${awayWon ? "text-wc-gold" : ""}`}>{m.awayTeam.shortCode}</span>
                            </div>
                            <span className={`font-black text-lg tabular-nums ${awayWon ? "text-wc-gold" : ""}`}>{m.awayScore ?? "-"}</span>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
