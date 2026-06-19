import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Emoji } from "@/components/Emoji";

// Lista użytkowników rzadko się zmienia - 5 min cache
export const revalidate = 300;

export default async function ComparePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Wszyscy z lig do których należę (bez siebie)
  const myMemberships = await prisma.membership.findMany({
    where: { userId: user.id },
    select: { leagueId: true },
  });
  const leagueIds = myMemberships.map((m) => m.leagueId);

  const rivals = await prisma.user.findMany({
    where: {
      id: { not: user.id },
      memberships: { some: { leagueId: { in: leagueIds } } },
    },
    select: { id: true, nickname: true, avatar: true },
    orderBy: { nickname: "asc" },
  });

  return (
    <section className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-black mb-1">Pojedynek ⚔️</h1>
      <p className="text-app-muted mb-6">
        Wybierz przeciwnika i porównaj swoje typy mecz po meczu.
      </p>

      {rivals.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-5xl mb-3">🪑</div>
          <div className="font-bold">Brak przeciwników</div>
          <p className="text-sm text-app-subtle mt-1">
            Dołącz do ligi z kumplami, żeby z nimi rywalizować.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rivals.map((r) => (
            <li key={r.id}>
              <Link
                href={`/compare/${r.id}`}
                className="card p-4 flex items-center gap-3 hover:border-wc-red/40 transition"
              >
                <Emoji char={r.avatar} size="lg" alt={r.nickname} />
                <span className="font-bold flex-1">{r.nickname}</span>
                <span className="chip bg-wc-red/10 text-wc-red text-xs">Pojedynek →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
