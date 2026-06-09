import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { setSession, getCurrentUser } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { LoginForm, SignUpForm } from "./forms";

export const dynamic = "force-dynamic";

const AVATARS = ["⚽", "🏆", "🔥", "🦁", "🐉", "🦅", "🐂", "🦊", "🐺", "🦈", "👽", "🥇", "🐍", "🦖", "🐙"];

export type FormState = { error?: string };

async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  "use server";
  const nickname = String(formData.get("nickname") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!nickname || !password) return { error: "Wpisz nick i hasło" };

  const user = await prisma.user.findUnique({ where: { nickname } });
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return { error: "Nieprawidłowy nick lub hasło" };
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

  // Auto-dołączenie do głównej ligi MUNDIAL2026 (jeśli nie ta sama)
  if (inviteCode !== "MUNDIAL2026") {
    const mundial = await prisma.league.findUnique({ where: { inviteCode: "MUNDIAL2026" } });
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
