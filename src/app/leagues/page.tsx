import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

async function createLeague(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  let inviteCode = String(formData.get("inviteCode") ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (!inviteCode) {
    inviteCode = randomBytes(4).toString("hex").toUpperCase();
  }

  try {
    const league = await prisma.league.create({ data: { name, inviteCode } });
    await prisma.membership.create({ data: { userId: user.id, leagueId: league.id } });
  } catch (e) {
    // unique conflict — najprawdopodobniej kod zajęty
  }
  revalidatePath("/leagues");
}

async function joinLeague(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const code = String(formData.get("inviteCode") ?? "").trim().toUpperCase();
  if (!code) return;
  const league = await prisma.league.findUnique({ where: { inviteCode: code } });
  if (!league) return;
  await prisma.membership.upsert({
    where: { userId_leagueId: { userId: user.id, leagueId: league.id } },
    update: {},
    create: { userId: user.id, leagueId: league.id },
  });
  revalidatePath("/leagues");
}

async function leaveLeague(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const leagueId = String(formData.get("leagueId") ?? "");
  if (!leagueId) return;
  await prisma.membership.deleteMany({ where: { userId: user.id, leagueId } });
  revalidatePath("/leagues");
}

export default async function LeaguesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { league: { include: { _count: { select: { memberships: true } } } } },
    orderBy: { league: { createdAt: "asc" } },
  });

  return (
    <section className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-black mb-1">Moje ligi 🏟️</h1>
      <p className="text-white/60 mb-6">
        Możesz być w wielu ligach na raz — każda ma swój ranking. Stwórz ligę dla znajomych z pracy, drugą dla osiedlowych itd.
      </p>

      <div className="space-y-3 mb-8">
        {memberships.length === 0 && (
          <div className="card p-6 text-center text-white/50 text-sm">Nie należysz do żadnej ligi.</div>
        )}
        {memberships.map((m) => (
          <div key={m.id} className="card p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-black truncate">{m.league.name}</div>
              <div className="text-xs text-white/40">
                {m.league._count.memberships} {m.league._count.memberships === 1 ? "gracz" : "graczy"} · kod{" "}
                <code className="bg-white/5 px-1.5 py-0.5 rounded">{m.league.inviteCode}</code>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/leaderboard?league=${m.league.id}`} className="btn-primary text-sm py-1.5 px-3">Ranking</Link>
              {memberships.length > 1 && (
                <form action={leaveLeague}>
                  <input type="hidden" name="leagueId" value={m.league.id} />
                  <button className="btn-ghost text-sm py-1.5 px-3">Opuść</button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <form action={createLeague} className="card p-5 space-y-3">
          <h2 className="font-black">Stwórz nową ligę</h2>
          <div>
            <label className="text-xs font-semibold text-white/60">Nazwa</label>
            <input name="name" required maxLength={40} className="input mt-1" placeholder="np. Liga ekipy z pracy" />
          </div>
          <div>
            <label className="text-xs font-semibold text-white/60">Kod zaproszenia (opcjonalny)</label>
            <input name="inviteCode" maxLength={20} className="input mt-1 uppercase" placeholder="auto-generowany" />
          </div>
          <button className="btn-primary w-full">Stwórz</button>
        </form>

        <form action={joinLeague} className="card p-5 space-y-3">
          <h2 className="font-black">Dołącz do istniejącej</h2>
          <div>
            <label className="text-xs font-semibold text-white/60">Kod zaproszenia</label>
            <input name="inviteCode" required maxLength={20} className="input mt-1 uppercase" placeholder="np. MUNDIAL2026" />
          </div>
          <div className="h-[68px] hidden sm:block"></div>
          <button className="btn-primary w-full">Dołącz</button>
        </form>
      </div>
    </section>
  );
}
