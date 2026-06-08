import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { MobileNav } from "@/components/MobileNav";
import { RegisterSW } from "@/components/RegisterSW";
import { Sidebar } from "@/components/Sidebar";
import { ThemeInitScript, ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "WC Predictor 2026",
  description: "Typuj wyniki Mundialu 2026 z ekipą",
  applicationName: "WC Predictor 2026",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WC2026",
  },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon.svg" }],
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  themeColor: "#0B0F19",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="pl">
      <head><ThemeInitScript /></head>
      <body>
        {user && <Sidebar nickname={user.nickname} avatar={user.avatar} isAdmin={user.isAdmin} />}

        {/* Mobile / niezalogowani: górny pasek */}
        <header className={`sticky top-0 z-20 backdrop-blur border-b border-app ${user ? "md:hidden" : ""}`} style={{ background: "var(--header-bg)" }}>
          <nav className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-black text-lg">
              <span className="text-2xl leading-none">⚽</span>
              <span>WC Predictor <span className="text-wc-lime">2026</span></span>
            </Link>
            {user ? (
              <div className="flex items-center gap-2">
                <ThemeToggle compact />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ThemeToggle compact />
                <Link href="/login" className="btn-primary text-sm">Zaloguj się</Link>
              </div>
            )}
          </nav>
        </header>

        <main className={`mx-auto max-w-5xl px-4 py-6 pb-24 md:pb-6 ${user ? "md:pl-64" : ""}`}>
          {children}
        </main>

        <footer className={`mx-auto max-w-5xl px-4 py-10 pb-28 md:pb-10 text-center text-xs ${user ? "md:pl-64" : ""}`} style={{ color: "var(--text-subtle)" }}>
          Aplikacja wykonana przez rpisonfire &amp; Claude Code na Mistrzostwa Świata 2026 w piłce nożnej ⚽
        </footer>

        {user && <MobileNav isAdmin={user.isAdmin} />}
        <RegisterSW />
      </body>
    </html>
  );
}
