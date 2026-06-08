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
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
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
          <nav className="mx-auto max-w-5xl flex items-center justify-between px-4 py-2">
            <Link href="/" className="flex items-center gap-1.5 font-black">
              <span className="text-xl leading-none">⚽</span>
              <span className="text-base">WC Predictor <span className="text-wc-lime">2026</span></span>
            </Link>
            {user ? (
              <ThemeToggle compact />
            ) : (
              <div className="flex items-center gap-2">
                <ThemeToggle compact />
                <Link href="/login" className="btn-primary text-sm whitespace-nowrap">Zaloguj</Link>
              </div>
            )}
          </nav>
        </header>

        <main className={`mx-auto max-w-5xl px-3 sm:px-4 py-4 sm:py-6 pb-24 md:pb-6 ${user ? "md:pl-64" : ""}`}>
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
