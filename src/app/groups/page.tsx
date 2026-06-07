import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { groupStandings } from "@/lib/groups";

export default async function GroupsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const groups = await groupStandings();

  return (
    <section>
      <h1 className="text-3xl font-black mb-1">Tabele grupowe 📊</h1>
      <p className="text-white/60 mb-6">Klasyfikacja każdej grupy. Top 2 i 8 najlepszych z 3. miejsca awansuje.</p>

      {groups.length === 0 && (
        <div className="card p-10 text-center">
          <div className="text-5xl mb-3">📋</div>
          <div className="font-bold">Brak meczów grupowych w bazie</div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((g) => (
          <div key={g.name} className="card overflow-hidden">
            <div className="px-4 py-3 bg-white/5 border-b border-white/10 font-black">{g.name}</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-white/40">
                  <th className="text-left py-2 pl-3"></th>
                  <th className="text-left">Drużyna</th>
                  <th className="text-center w-8">M</th>
                  <th className="text-center w-10">+/-</th>
                  <th className="text-center w-8 pr-3">Pkt</th>
                </tr>
              </thead>
              <tbody>
                {g.teams.map((t, i) => (
                  <tr key={t.teamId} className="border-t border-white/5">
                    <td className="pl-3 py-2 text-white/40 font-black">{i + 1}.</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{t.flag}</span>
                        <span className="font-bold truncate">{t.shortCode}</span>
                      </div>
                    </td>
                    <td className="text-center text-white/60">{t.played}</td>
                    <td className="text-center text-white/60 tabular-nums">{t.gd >= 0 ? `+${t.gd}` : t.gd}</td>
                    <td className="text-center pr-3 font-black text-wc-gold">{t.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
  );
}
