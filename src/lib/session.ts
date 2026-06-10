import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";

const COOKIE = "wcp_session";

export async function getCurrentUser() {
  const c = await cookies();
  const userId = c.get(COOKIE)?.value;
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    include: { memberships: { include: { league: true } } },
  });
}

export async function setSession(userId: string) {
  const c = await cookies();
  c.set(COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function clearSession() {
  const c = await cookies();
  c.delete(COOKIE);
}

export async function isAdmin() {
  const user = await getCurrentUser();
  return !!user?.isAdmin;
}

/** Zwraca usera lub przekierowuje do logowania. Używaj w server components/actions. */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Zwraca admina lub przekierowuje. */
export async function requireAdmin() {
  const user = await requireAuth();
  if (!user.isAdmin) redirect("/dashboard");
  return user;
}
