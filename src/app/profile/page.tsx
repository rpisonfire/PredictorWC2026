import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { clearSession, getCurrentUser } from "@/lib/session";
import Link from "next/link";
import { statsForUser, badgesFor, championBonusForUser, CHAMPION_BONUS, userStyles } from "@/lib/stats";
import { championPickIsLocked } from "@/lib/championLock";
import { hashPassword, verifyPassword } from "@/lib/password";
import { ChangePasswordForm } from "./change-password";
import { NotificationsButton } from "@/components/NotificationsButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Emoji } from "@/components/Emoji";

const AVATARS = ["⚽", "🏆", "🔥", "🦁", "🐉", "🦅", "🐂", "🦊", "🐺", "🦈", "👽", "🥇", "🐍", "🦖", "🐙"];

async function update(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const avatar = String(formData.get("avatar") ?? user.avatar);
  await prisma.user.update({ where: { id: user.id }, data: { avatar } });
  revalidatePath("/");
}

export type PwState = { ok?: boolean; error?: string };

async function changePassword(_prev: PwState, formData: FormData): Promise<PwState> {
  "use server";
  const user = await getCurrentUser();
  if (!user) return { error: "Nie jesteś zalogowany" };
  const oldPw = String(formData.get("oldPassword") ?? "");
  const newPw = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  if (!oldPw || !newPw) return { error: "Wypełnij wszystkie pola" };
  if (newPw.length < 6) return { error: "Nowe hasło musi mieć min. 6 znaków" };
  if (newPw !== confirm) return { error: "Nowe hasła nie pasują" };
  if (!user.passwordHash || !verifyPassword(oldPw, user.passwordHash)) {
    return { error: "Stare hasło jest nieprawidłowe" };
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(newPw) } });
  return { ok: true };
}

async function logout() {
  "use server";
  await clearSession();
  redirect("/");
}

export default async function Profile() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const stats = await statsForUser(user.id);
  const badges = badgesFor(stats);
  const champ = user.predictedChampionId
    ? await prisma.team.findUnique({ where: { id: user.predictedChampionId } })
    : null;
  const champBonus = await championBonusForUser(user.id);
  const champLock = await championPickIsLocked();
  const allStyles = await userStyles();
  const myStyle = allStyles.find((s) => s.userId === user.id);

  return (
    <section className="max-w-md mx-auto">
      <h1 className="text-3xl font-black mb-6">Profil</h1>

      <div className="card p-6 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <Emoji char={user.avatar} size="2xl" alt={user.nickname} />
          <div>
            <div className="font-black text-2xl">{user.nickname}</div>
            <div className="text-xs text-app-subtle">{stats.totalPoints} pkt łącznie</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <Stat label="Celność" value={`${stats.accuracy.toFixed(0)}%`} />
          <Stat label="Średnia/mecz" value={stats.avgPointsPerMatch.toFixed(1)} />
          <Stat label="Dokładne wyniki" value={stats.exactScoreHits} />
          <Stat label="Trafieni strzelcy" value={stats.scorerHits} />
          <Stat label="Najdłuższa seria" value={stats.longestStreak} />
          <Stat label="Udane boosty" value={stats.successfulBoosts} />
        </div>

        <div className="mt-5 pt-5 border-t border-app">
          <div className="text-xs uppercase tracking-wider text-app-subtle mb-2">Twój typ na mistrza 🏆</div>
          {champ ? (
            <div className="flex items-center gap-3">
              <span className="text-3xl">{champ.flag}</span>
              <span className="font-black flex-1">{champ.name}</span>
              {champBonus > 0 ? (
                <span className="chip bg-wc-gold/20 text-wc-gold">+{champBonus} pkt 🎉</span>
              ) : champLock.locked ? (
                <span className="chip bg-app-hover text-app-subtle">🔒 zablokowany</span>
              ) : (
                <Link href="/champion" className="chip bg-wc-red/15 text-wc-red hover:bg-wc-red/25">Zmień</Link>
              )}
            </div>
          ) : champLock.locked ? (
            <div className="text-sm text-app-subtle">Nie wybrałeś mistrza przed końcem fazy grupowej.</div>
          ) : (
            <Link href="/champion" className="btn-primary w-full justify-center">
              ⚡ Wybierz mistrza (+{CHAMPION_BONUS} pkt jeśli trafisz)
            </Link>
          )}
        </div>


        {myStyle && (
          <div className="mt-5 pt-5 border-t border-app">
            <div className="text-xs uppercase tracking-wider text-app-subtle mb-2">Twój styl typowania</div>
            <div className="flex items-center gap-3">
              <div className="text-4xl">{myStyle.style.emoji}</div>
              <div className="flex-1">
                <div className="font-black text-lg">{myStyle.style.label}</div>
                <div className="text-xs text-app-subtle">
                  śr. {myStyle.avgGoals.toFixed(1)} br/mecz · {(myStyle.drawRate * 100).toFixed(0)}% remisów · {(myStyle.highRate * 100).toFixed(0)}% wysokich
                </div>
              </div>
            </div>
          </div>
        )}

        {badges.length > 0 && (
          <div className="mt-5 pt-5 border-t border-app">
            <div className="text-xs uppercase tracking-wider text-app-subtle mb-2">Odznaki</div>
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <span key={b.key} className="chip bg-wc-gold/10 text-wc-gold" title={b.description}>
                  {b.emoji} {b.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card p-6 space-y-5">
        <form action={update} className="space-y-3">
          <div className="text-sm font-semibold">Awatar</div>
          <div className="grid grid-cols-5 gap-2">
            {AVATARS.map((a) => (
              <label key={a} className="cursor-pointer">
                <input type="radio" name="avatar" value={a} defaultChecked={user.avatar === a} className="peer sr-only" />
                <span className="flex items-center justify-center aspect-square text-3xl rounded-xl border border-app peer-checked:border-wc-red peer-checked:bg-wc-red/10">{a}</span>
              </label>
            ))}
          </div>
          <button className="btn-primary w-full">Zapisz</button>
        </form>
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-app-subtle">Ligi</div>
            <Link href="/leagues" className="text-xs text-wc-red font-bold hover:underline">Zarządzaj →</Link>
          </div>
          {user.memberships.map((m) => (
            <div key={m.id} className="flex justify-between items-center py-2 border-t border-app">
              <span className="font-bold">{m.league.name}</span>
              <code className="text-xs bg-app-hover px-2 py-1 rounded">{m.league.inviteCode}</code>
            </div>
          ))}
        </div>
        <NotificationsButton />
        <ThemeToggle />
        <ChangePasswordForm action={changePassword} />

        <form action={logout}>
          <button className="btn-ghost w-full">Wyloguj się</button>
        </form>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-app-hover p-3">
      <div className="text-xs text-app-subtle uppercase tracking-wider">{label}</div>
      <div className="text-xl font-black">{value}</div>
    </div>
  );
}
