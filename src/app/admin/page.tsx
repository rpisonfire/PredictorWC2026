import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { scorePrediction } from "@/lib/scoring";
import { hashPassword } from "@/lib/password";
import { getCurrentUser } from "@/lib/session";
import { fmtDate, fmtDateTimeLong } from "@/lib/dates";

async function setResult(formData: FormData) {
  "use server";
  const matchId = String(formData.get("matchId"));
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));
  const firstScorerTeam = String(formData.get("firstScorerTeam") || "NONE") as "HOME" | "AWAY" | "NONE";
  const firstGoalPlayerId = String(formData.get("firstGoalPlayerId") || "") || null;

  await prisma.match.update({
    where: { id: matchId },
    data: { homeScore, awayScore, firstScorerTeamId: null, firstGoalPlayerId },
  });

  // Recalculate points for all predictions on this match
  const preds = await prisma.prediction.findMany({ where: { matchId } });
  for (const p of preds) {
    const pts = scorePrediction(
      {
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        firstScorerTeam: (p.firstScorerTeam as any) ?? null,
        firstGoalPlayerId: p.firstGoalPlayerId,
      },
      { homeScore, awayScore, firstScorerTeam, firstGoalPlayerId }
    );
    await prisma.prediction.update({ where: { id: p.id }, data: { pointsAwarded: pts } });
  }

  revalidatePath("/leaderboard");
  revalidatePath("/admin");
}

async function setChampion(formData: FormData) {
  "use server";
  const teamId = String(formData.get("teamId") ?? "") || null;
  const leagues = await prisma.league.findMany();
  for (const l of leagues) {
    await prisma.league.update({ where: { id: l.id }, data: { actualChampionId: teamId } });
  }
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  revalidatePath("/profile");
}

async function resetPassword(formData: FormData) {
  "use server";
  const userId = String(formData.get("userId"));
  const temp = randomBytes(4).toString("hex"); // 8 chars
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hashPassword(temp) } });
  const { cookies } = await import("next/headers");
  const c = await cookies();
  c.set("wcp_reset_info", `${userId}:${temp}`, { httpOnly: true, path: "/admin", maxAge: 300 });
  revalidatePath("/admin");
}

export default async function Admin({
  searchParams,
}: { searchParams: Promise<{ tab?: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!me.isAdmin) {
    return (
      <section className="max-w-md mx-auto py-10 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-3xl font-black mb-2">Brak dostępu</h1>
        <p className="text-white/60 mb-6">Ta strona jest tylko dla admina ligi.</p>
        <Link href="/dashboard" className="btn-primary">Wróć do meczów</Link>
      </section>
    );
  }

  const { tab } = await searchParams;
  const activeTab = tab === "users" ? "users" : "matches";

  if (tab === "champion") {
    const teams = await prisma.team.findMany({ orderBy: { name: "asc" } });
    const league = await prisma.league.findFirst({ include: { actualChampion: true } });
    const users = await prisma.user.findMany({ include: { predictedChampion: true } });
    return (
      <section>
        <AdminTabs active="champion" />
        <h1 className="text-3xl font-black mb-6">Mistrz turnieju 🏆</h1>
        <form action={setChampion} className="card p-6 mb-6">
          <label className="text-sm font-semibold">Aktualnie ustawiony mistrz</label>
          <div className="flex gap-3 mt-2">
            <select name="teamId" defaultValue={league?.actualChampionId ?? ""} className="input flex-1">
              <option value="">- jeszcze nieustalony -</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.flag} {t.name}</option>
              ))}
            </select>
            <button className="btn-primary">Zapisz</button>
          </div>
          {league?.actualChampion && (
            <div className="text-xs text-white/40 mt-2">
              Każdy kto wytypował {league.actualChampion.flag} {league.actualChampion.name} dostaje +10 pkt.
            </div>
          )}
        </form>

        <h2 className="text-lg font-black mb-3">Typy graczy</h2>
        <div className="card overflow-hidden">
          {users.map((u) => {
            const hit = league?.actualChampionId && u.predictedChampionId === league.actualChampionId;
            return (
              <div key={u.id} className="flex items-center justify-between px-5 py-3 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{u.avatar}</span>
                  <span className="font-bold">{u.nickname}</span>
                </div>
                {u.predictedChampion ? (
                  <span className={`chip ${hit ? "bg-wc-gold/20 text-wc-gold" : "bg-white/5 text-white/60"}`}>
                    {u.predictedChampion.flag} {u.predictedChampion.name} {hit && "🎉 +10"}
                  </span>
                ) : (
                  <span className="text-xs text-white/30">brak typu</span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (activeTab === "users") {
    const users = await prisma.user.findMany({ orderBy: { nickname: "asc" } });
    const { cookies } = await import("next/headers");
    const c = await cookies();
    const resetInfo = c.get("wcp_reset_info")?.value;
    const [resetId, tempPw] = resetInfo ? resetInfo.split(":") : [];
    return (
      <section>
        <AdminTabs active="users" />
        <h1 className="text-3xl font-black mb-6">Admin - użytkownicy</h1>
        <div className="card overflow-hidden">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-5 py-3 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{u.avatar}</span>
                <div>
                  <div className="font-bold">{u.nickname}</div>
                  <div className="text-xs text-white/40">utworzony {fmtDate(u.createdAt)}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {resetId === u.id && tempPw && (
                  <div className="text-sm">
                    Nowe hasło: <code className="bg-wc-gold/15 text-wc-gold px-2 py-1 rounded font-bold">{tempPw}</code>
                  </div>
                )}
                <form action={resetPassword}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button className="btn-ghost text-sm py-1.5 px-3">Reset hasła</button>
                </form>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/40 mt-3">Tymczasowe hasło widoczne tylko teraz. Podaj kumplowi i powiedz żeby je zmienił (nie ma jeszcze funkcji zmiany hasła - TODO).</p>
      </section>
    );
  }

  const matches = await prisma.match.findMany({
    orderBy: { kickoff: "asc" },
    include: {
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
    },
  });

  return (
    <section>
      <AdminTabs active="matches" />
      <h1 className="text-3xl font-black mb-6">Admin - wpisz wyniki</h1>
      <div className="space-y-4">
        {matches.map((m) => (
          <form key={m.id} action={setResult} className="card p-4">
            <input type="hidden" name="matchId" value={m.id} />
            <div className="flex items-center justify-between mb-2 text-sm text-white/50">
              <span>{m.stage} · Kolejka {m.matchday}</span>
              <span>{fmtDateTimeLong(m.kickoff)}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 font-bold">{m.homeTeam.flag} {m.homeTeam.name}</div>
              <input type="number" name="homeScore" min={0} defaultValue={m.homeScore ?? ""} className="input w-16 text-center" />
              <span className="font-black">:</span>
              <input type="number" name="awayScore" min={0} defaultValue={m.awayScore ?? ""} className="input w-16 text-center" />
              <div className="flex-1 font-bold text-right">{m.awayTeam.name} {m.awayTeam.flag}</div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <select name="firstScorerTeam" className="input">
                <option value="NONE">Pierwszy strzał: brak (0:0)</option>
                <option value="HOME">Pierwszy strzał: {m.homeTeam.shortCode}</option>
                <option value="AWAY">Pierwszy strzał: {m.awayTeam.shortCode}</option>
              </select>
              <select name="firstGoalPlayerId" className="input" defaultValue={m.firstGoalPlayerId ?? ""}>
                <option value="">Pierwszy strzelec: brak</option>
                {[...m.homeTeam.players, ...m.awayTeam.players].map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <button className="btn-primary w-full mt-3">Zapisz wynik i przelicz punkty</button>
          </form>
        ))}
      </div>
    </section>
  );
}

function AdminTabs({ active }: { active: "matches" | "users" | "champion" }) {
  const tabs = [
    { key: "matches",  href: "/admin",                label: "Mecze" },
    { key: "users",    href: "/admin?tab=users",      label: "Użytkownicy" },
    { key: "champion", href: "/admin?tab=champion",   label: "Mistrz 🏆" },
  ];
  return (
    <div className="flex gap-2 mb-6 flex-wrap">
      {tabs.map((t) => (
        <a
          key={t.key}
          href={t.href}
          className={`px-3 py-1.5 rounded-xl text-sm font-bold ${active === t.key ? "bg-wc-red text-white" : "bg-white/5 text-white/60"}`}
        >
          {t.label}
        </a>
      ))}
    </div>
  );
}
