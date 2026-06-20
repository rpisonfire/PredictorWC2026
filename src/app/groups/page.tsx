import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { groupStandings } from "@/lib/groups";
import { Flag } from "@/components/Flag";

// Tabele grupowe - cache 15 min, admin invaliduje natychmiast po wpisaniu wyniku.
export const revalidate = 900;

export default async function GroupsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const groups = await groupStandings();

  return (
    <section>
      <h1 className="text-3xl font-black mb-1">Tabele grupowe 📊</h1>
      <p className="text-app-muted mb-6">Klasyfikacja każdej grupy. Top 2 i 8 najlepszych z 3. miejsca awansuje.</p>

      {groups.length === 0 && (
        <div className="card p-10 text-center">
          <div className="text-5xl mb-3">📋</div>
          <div className="font-bold">Brak meczów grupowych w bazie</div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((g) => (
          <div key={g.name} className="stat-section" style={{ padding: 0 }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(241,180,52,0.2)", background: "rgba(241,180,52,0.08)" }}>
              <h2 style={{ marginBottom: 0 }}>{g.name}</h2>
            </div>
            <table className="w-full text-sm" style={{ position: "relative", zIndex: 2 }}>
              <thead>
                <tr style={{ color: "rgba(241,180,52,0.7)", fontFamily: "'Courier New', monospace" }} className="text-[10px] uppercase tracking-wider">
                  <th className="text-left py-2 pl-3"></th>
                  <th className="text-left">Drużyna</th>
                  <th className="text-center w-8">M</th>
                  <th className="text-center w-10">+/-</th>
                  <th className="text-center w-8 pr-3">Pkt</th>
                </tr>
              </thead>
              <tbody>
                {g.teams.map((t, i) => (
                  <tr key={t.teamId} style={{ borderTop: "1px solid rgba(241,180,52,0.1)" }}>
                    <td className="pl-3 py-2 font-black" style={{ color: i < 2 ? "#4ADE80" : "rgba(255,255,255,0.4)", fontFamily: "'Courier New', monospace" }}>{i + 1}.</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <Flag emoji={t.flag} size="sm" alt={t.name} />
                        <span className="font-bold truncate text-white">{t.shortCode}</span>
                      </div>
                    </td>
                    <td className="text-center" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "'Courier New', monospace" }}>{t.played}</td>
                    <td className="text-center tabular-nums" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "'Courier New', monospace" }}>{t.gd >= 0 ? `+${t.gd}` : t.gd}</td>
                    <td className="text-center pr-3 font-black" style={{ color: "#F1B434", fontFamily: "'Courier New', monospace", textShadow: "0 0 6px rgba(241,180,52,0.3)" }}>{t.points}</td>
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
