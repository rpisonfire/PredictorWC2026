import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { setSession, getCurrentUser } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { LoginForm, SignUpForm } from "./forms";

export const dynamic = "force-dynamic";

const AVATARS = ["⚽", "🏆", "🔥", "🦁", "🐉", "🦅", "🐂", "🦊", "🐺", "🦈", "👽", "🥇", "🐍", "🦖", "🐙"];

export type FormState = { error?: string };

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  "use server";
  const nickname = String(formData.get("nickname") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!nickname || !password) return { error: "Wpisz nick i hasło" };

  const user = await prisma.user.findUnique({ where: { nickname } });
  // Stała reakcja czasowa - nawet jak nie ma usera, weryfikujemy fake hash
  // (zapobiega timing attack i nie ujawnia czy nick istnieje)
  if (!user || !user.passwordHash) {
    verifyPassword(password, "dummy:0000000000000000000000000000000000000000000000000000000000000000");
    return { error: "Nieprawidłowy nick lub hasło" };
  }

  // Sprawdź blokadę
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return { error: `Zbyt wiele prób. Konto zablokowane na ${minutesLeft} min. Skontaktuj się z adminem żeby zresetował hasło.` };
  }

  if (!verifyPassword(password, user.passwordHash)) {
    // Admina nie blokujemy - zamiast tego dłuższe opóźnienie i tylko zliczamy
    if (user.isAdmin) {
      await new Promise((r) => setTimeout(r, 1500));
      await prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: user.failedAttempts + 1 },
      });
      return { error: "Nieprawidłowe hasło." };
    }
    const newAttempts = user.failedAttempts + 1;
    const shouldLock = newAttempts >= MAX_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: shouldLock ? 0 : newAttempts,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      },
    });
    if (shouldLock) {
      return { error: `Zbyt wiele nieudanych prób. Konto zablokowane na ${LOCK_MINUTES} min.` };
    }
    const left = MAX_ATTEMPTS - newAttempts;
    return { error: `Nieprawidłowe hasło. Pozostało prób: ${left}.` };
  }

  // Sukces - zeruj licznik
  if (user.failedAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });
  }
  await setSession(user.id);
  redirect("/dashboard");
}

async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  "use server";
  const nickname = String(formData.get("nickname") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const inviteCode = String(formData.get("inviteCode") ?? "").trim().toUpperCase();
  const avatar = String(formData.get("avatar") ?? "⚽");
  const predictedChampionId = String(formData.get("predictedChampionId") ?? "") || null;

  if (!nickname || !password || !inviteCode) return { error: "Wypełnij wszystkie pola" };
  if (password.length < 6) return { error: "Hasło musi mieć co najmniej 6 znaków" };
  if (!predictedChampionId) return { error: "Wybierz mistrza turnieju" };

  const league = await prisma.league.findUnique({ where: { inviteCode } });
  if (!league) return { error: "Nieprawidłowy kod zaproszenia" };

  const exists = await prisma.user.findUnique({ where: { nickname } });
  if (exists) return { error: "Ten nick jest już zajęty" };

  const user = await prisma.user.create({
    data: { nickname, avatar, passwordHash: hashPassword(password), predictedChampionId },
  });
  await prisma.membership.create({ data: { userId: user.id, leagueId: league.id } });

  // Auto-dołączenie do głównej ligi (jeśli skonfigurowana w env)
  const mainLeagueCode = process.env.MAIN_LEAGUE_CODE;
  if (mainLeagueCode && inviteCode !== mainLeagueCode) {
    const mundial = await prisma.league.findUnique({ where: { inviteCode: mainLeagueCode } });
    if (mundial && mundial.id !== league.id) {
      await prisma.membership.upsert({
        where: { userId_leagueId: { userId: user.id, leagueId: mundial.id } },
        update: {},
        create: { userId: user.id, leagueId: mundial.id },
      });
    }
  }

  await setSession(user.id);
  redirect("/dashboard");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const { mode } = await searchParams;
  const isSignUp = mode === "signup";

  return (
    <section className="max-w-md mx-auto py-10">
      <div className="flex gap-2 mb-6">
        <Link
          href="/login"
          className={`flex-1 text-center py-2 rounded-xl font-bold ${!isSignUp ? "bg-wc-red text-white" : "bg-app-hover text-app-muted"}`}
        >
          Logowanie
        </Link>
        <Link
          href="/login?mode=signup"
          className={`flex-1 text-center py-2 rounded-xl font-bold ${isSignUp ? "bg-wc-red text-white" : "bg-app-hover text-app-muted"}`}
        >
          Rejestracja
        </Link>
      </div>

      {isSignUp ? (
        <SignUpFormWrapper action={signUpAction} avatars={AVATARS} />
      ) : (
        <LoginForm action={signInAction} />
      )}
    </section>
  );
}

async function SignUpFormWrapper({ action, avatars }: { action: any; avatars: string[] }) {
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, flag: true },
  });
  return <SignUpForm action={action} avatars={avatars} teams={teams} />;
}
