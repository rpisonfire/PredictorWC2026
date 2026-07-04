import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { BracketTree, type BracketMatch, type BracketSlots } from "@/components/BracketTree";
import { sideRowFor } from "@/lib/wc2026Bracket";
import { buildFifaMapping } from "@/lib/advancement";

export const revalidate = 300;

export default async function BracketPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const matches = await prisma.match.findMany({
    where: { NOT: { stage: { startsWith: "Grupa" } } },
    include: { homeTeam: true, awayTeam: true },
    orderBy: [{ kickoff: "asc" }, { id: "asc" }],
  });

  const hasAnyMatches = matches.length > 0;

  const empty = (n: number) => Array.from({ length: n }, () => null as BracketMatch | null);
  const slots: BracketSlots = {
    r16L: empty(8), r16R: empty(8),
    r8L: empty(4), r8R: empty(4),
    qfL: empty(2), qfR: empty(2),
    sfL: empty(1), sfR: empty(1),
    final: null, bronze: null,
  };

  // Jedno źródło prawdy: ten sam mapping FIFA M co propagacja awansu w adminie/cronie.
  // Identyfikuje mecze po drużynach (łańcuch awansów), nie po chronologii kickoff -
  // numeracja FIFA w rundzie nie jest chronologiczna i pary potrafiły się zamieniać.
  const mapping = await buildFifaMapping();

  for (const m of matches) {
    const num = mapping.byId.get(m.id);
    if (num === undefined) continue;
    const cast = m as unknown as BracketMatch;
    if (num === 104) { slots.final = cast; continue; }
    if (num === 103) { slots.bronze = cast; continue; }
    const pos = sideRowFor(num);
    if (!pos) continue;
    const stage = num >= 73 && num <= 88 ? "r16" : num >= 89 && num <= 96 ? "r8" : num >= 97 && num <= 100 ? "qf" : "sf";
    const key = `${stage}${pos.side}` as keyof BracketSlots;
    (slots[key] as (BracketMatch | null)[])[pos.row] = cast;
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
