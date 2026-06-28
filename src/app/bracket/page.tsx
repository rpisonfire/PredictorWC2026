import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { prettyStage } from "@/lib/stageLabel";
import { BracketTree, type BracketMatch, type BracketSlots } from "@/components/BracketTree";
import { STAGE_FIRST_MATCH, bracketStageFromLabel, sideRowFor, r16FifaNumber, type BracketStage } from "@/lib/wc2026Bracket";

export const revalidate = 300;

export default async function BracketPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const matches = await prisma.match.findMany({
    where: { NOT: { stage: { startsWith: "Grupa" } } },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoff: "asc" },
  });

  const byStage = new Map<string, typeof matches>();
  for (const m of matches) {
    const stage = prettyStage(m.stage);
    const arr = byStage.get(stage) ?? [];
    arr.push(m);
    byStage.set(stage, arr);
  }

  const hasAnyMatches = matches.length > 0;

  const empty = (n: number) => Array.from({ length: n }, () => null as BracketMatch | null);
  const slots: BracketSlots = {
    r16L: empty(8), r16R: empty(8),
    r8L: empty(4), r8R: empty(4),
    qfL: empty(2), qfR: empty(2),
    sfL: empty(1), sfR: empty(1),
    final: null, bronze: null,
  };

  const fillStage = (stage: BracketStage, list: typeof matches) => {
    list.forEach((m, idx) => {
      const cast = m as unknown as BracketMatch;
      if (stage === "final") { slots.final = cast; return; }
      if (stage === "bronze") { slots.bronze = cast; return; }
      let num: number | null = null;
      // r16: identyfikacja po parze drużyn (chronologia kickoff != kolejność M73-M88)
      if (stage === "r16") {
        num = r16FifaNumber(m.homeTeam.shortCode, m.awayTeam.shortCode);
      } else {
        // r8/qf/sf: drużyny TBD, więc nie ma identyfikacji po teamach.
        // Sortowanie po kickoff w późniejszych fazach prawdopodobnie pokrywa się
        // z FIFA M89-M102 - można dopracować jak pojawią się prawdziwe dane.
        num = STAGE_FIRST_MATCH[stage] + idx;
      }
      if (num === null) return;
      const pos = sideRowFor(num);
      if (!pos) return;
      const key = `${stage}${pos.side}` as keyof BracketSlots;
      (slots[key] as (BracketMatch | null)[])[pos.row] = cast;
    });
  };
  for (const [label, list] of byStage.entries()) {
    const stage = bracketStageFromLabel(label);
    if (stage) fillStage(stage, list);
  }

  return (
    <section>
      <h1 className="text-3xl font-black mb-1">Drabinka pucharowa 🏆</h1>
      <p className="text-app-muted mb-6">
        {hasAnyMatches
          ? "Wszystkie mecze fazy pucharowej wg oficjalnej struktury FIFA. Pary awansowe pojawią się po zakończeniu fazy grupowej."
          : "Struktura drabinki Mundialu 2026 wg FIFA. Pary pojawią się po fazie grupowej."}
      </p>

      <BracketTree {...slots} />
    </section>
  );
}
