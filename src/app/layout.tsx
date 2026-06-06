import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "WC Predictor 2026",
  description: "Typuj wyniki Mundialu 2026 z ekipą",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="pl">
      <body>
        <header className="sticky top-0 z-30 bg-wc-ink/70 backdrop-blur border-b border-white/10">
          <nav className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-black text-lg">
              <span className="inline-block h-7 w-7 rounded-full bg-wc-red" />
              <span>WC Predictor <span className="text-wc-blue">2026</span></span>
            </Link>
            {user ? (
              <div className="flex items-center gap-4 text-sm">
                <Link href="/dashboard" className="hover:underline">Mecze</Link>
                <Link href="/my-predictions" className="hover:underline">Moje typy</Link>
                <Link href="/champion" className="hover:underline">Mistrz 🏆</Link>
                <Link href="/leaderboard" className="hover:underline">Tabela</Link>
                {user.isAdmin && <Link href="/admin" className="hover:underline text-wc-gold">Admin</Link>}
                <Link href="/profile" className="hover:underline">{user.avatar} {user.nickname}</Link>
              </div>
            ) : (
              <Link href="/login" className="btn-primary text-sm">Zaloguj się</Link>
            )}
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-10 text-center text-xs text-white/40">
          Aplikacja wykonana przez rpisonfire &amp; Claude Code na Mistrzostwa Świata 2026 w piłce nożnej ⚽
        </footer>
      </body>
    </html>
  );
}
