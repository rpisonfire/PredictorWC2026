import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { championPickIsLocked } from "@/lib/championLock";
import { fmtDateTimeLong } from "@/lib/dates";

async function setChampion(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { locked } = await championPickIsLocked();
  if (locked) return;
  const teamId = String(formData.get("teamId") ?? "") || null;
  if (!teamId) return;
  await prisma.user.update({ where: { id: user.id }, data: { predictedChampionId: teamId } });
  revalidatePath("/champion");
  revalidatePath("/profile");
  redirect("/profile");
}

export default async function ChampionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [teams, currentTeam, lock] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    user.predictedChampionId
      ? prisma.team.findUnique({ where: { id: user.predictedChampionId } })
      : Promise.resolve(null),
    championPickIsLocked(),
  ]);

  return (
    <section className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-black mb-1">Mistrz turnieju 🏆</h1>
      <p className="text-app-muted mb-6">
        Wybierz drużynę, która Twoim zdaniem wygra cały Mundial. <b>+10 pkt</b> jeśli trafisz.
      </p>

      {currentTeam && (
        <div className="card p-4 mb-5 border-wc-gold/40">
          <div className="text-xs uppercase tracking-wider text-app-subtle">Twój aktualny typ</div>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-3xl">{currentTeam.flag}</span>
            <span className="font-black text-xl">{currentTeam.name}</span>
          </div>
        </div>
      )}

      {lock.locked ? (
        <div className="card p-6 text-center border-app">
          <div className="text-4xl mb-2">🔒</div>
          <div className="font-black">Wybór zablokowany</div>
          <p className="text-sm text-app-muted mt-1">
            Faza grupowa się skończyła. Twój typ na mistrza został utrwalony.
          </p>
          <Link href="/profile" className="btn-ghost mt-4 inline-flex">Wróć do profilu</Link>
        </div>
      ) : (
        <form action={setChampion} className="card p-6 space-y-4">
          {lock.lockAt && (
            <div className="text-xs text-app-subtle">
              ⏰ Możesz zmieniać do {fmtDateTimeLong(lock.lockAt)}
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto p-1">
            {teams.map((t) => {
              const active = t.id === user.predictedChampionId;
              return (
                <label key={t.id} className="cursor-pointer">
                  <input type="radio" name="teamId" value={t.id} defaultChecked={active} className="peer sr-only" />
                  <span className={`flex items-center gap-2 p-3 rounded-xl border border-app peer-checked:border-wc-gold peer-checked:bg-wc-gold/10 hover:bg-app-hover ${active ? "ring-1 ring-wc-gold/30" : ""}`}>
                    <span className="text-2xl shrink-0">{t.flag}</span>
                    <span className="font-bold text-sm truncate">{t.name}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <button className="btn-primary w-full">Zapisz typ na mistrza</button>
        </form>
      )}
    </section>
  );
}
