"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

type NavItem = { href: string; label: string; emoji: string };

const PRIMARY: NavItem[] = [
  { href: "/dashboard",      label: "Mecze",     emoji: "⚽" },
  { href: "/bracket",        label: "Drabinka",  emoji: "🌳" },
  { href: "/leaderboard",    label: "Ranking",   emoji: "🏆" },
  { href: "/my-predictions", label: "Typy",      emoji: "📋" },
];

const SECONDARY: NavItem[] = [
  { href: "/champion",     label: "Typ na mistrza",    emoji: "🏆" },
  { href: "/groups",       label: "Grupy",             emoji: "📊" },
  { href: "/stats",        label: "Statystyki",        emoji: "🌍" },
  { href: "/profile",      label: "Profil",            emoji: "👤" },
];

export function MobileNav({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => { setMoreOpen(false); }, [pathname]);

  // Admin: zamiast Typów (które są dostępne z menu Więcej) - bezpośredni dostęp
  const primary = isAdmin
    ? [
        { href: "/dashboard",      label: "Mecze",    emoji: "⚽" },
        { href: "/bracket",        label: "Drabinka", emoji: "🌳" },
        { href: "/leaderboard",    label: "Ranking",  emoji: "🏆" },
        { href: "/admin",          label: "Admin",    emoji: "🛠️" },
      ]
    : PRIMARY;

  const secondary = isAdmin
    ? [...SECONDARY, { href: "/my-predictions", label: "Moje typy", emoji: "📋" }]
    : SECONDARY;

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {moreOpen && (
        <button
          aria-label="Zamknij menu"
          onClick={() => setMoreOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        />
      )}

      <div
        className={`md:hidden fixed left-0 right-0 z-40 transition-transform duration-300 ease-out ${
          moreOpen ? "translate-y-0" : "translate-y-[120%] pointer-events-none"
        }`}
        style={{ bottom: "80px" }}
      >
        <div className="mx-3 rounded-2xl border border-app shadow-2xl overflow-hidden" style={{ background: "var(--bg)" }}>
          <div className="px-5 py-3 border-b border-app text-xs uppercase tracking-wider text-app-subtle">
            Więcej
          </div>
          <ul>
            {secondary.map((it) => {
              const active = isActive(it.href);
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className={`flex items-center gap-3 px-5 py-3.5 active:bg-app-hover transition relative ${active ? "bg-accent-soft" : ""}`}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-2/3 w-[3px] rounded-r"
                        style={{ background: "var(--accent)" }}
                      />
                    )}
                    <span className="text-xl w-7 text-center">{it.emoji}</span>
                    <span className="font-bold flex-1">{it.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]" aria-label="Główna nawigacja">
        <div className="mx-3 mb-3 rounded-2xl border border-app shadow-2xl backdrop-blur" style={{ background: "var(--header-bg)" }}>
          <ul className="grid grid-cols-5">
            {primary.map((it) => {
              const active = isActive(it.href);
              return (
                <li key={it.href}>
                  <Link href={it.href} className="flex flex-col items-center gap-0.5 py-2.5 relative active:scale-95 transition-transform">
                    <span aria-hidden className={`absolute top-0 left-1/2 -translate-x-1/2 h-[3px] rounded-full transition-all duration-300 ${active ? "w-8" : "w-0"}`} style={{ background: "var(--accent)" }} />
                    <span className={`text-xl leading-none transition-transform ${active ? "scale-110" : "opacity-70"}`}>{it.emoji}</span>
                    <span className={`text-[10px] uppercase tracking-wider font-bold ${active ? "text-app" : "text-app-subtle"}`}>{it.label}</span>
                  </Link>
                </li>
              );
            })}
            <li>
              <button type="button" onClick={() => setMoreOpen((o) => !o)} className="w-full flex flex-col items-center gap-0.5 py-2.5 relative active:scale-95 transition-transform">
                <span aria-hidden className={`absolute top-0 left-1/2 -translate-x-1/2 h-[3px] rounded-full transition-all duration-300 ${moreOpen ? "w-8" : "w-0"}`} style={{ background: "var(--accent)" }} />
                <span className={`text-xl leading-none transition-transform duration-300 ${moreOpen ? "rotate-90 scale-110" : "opacity-70"}`}>{moreOpen ? "✕" : "☰"}</span>
                <span className={`text-[10px] uppercase tracking-wider font-bold ${moreOpen ? "text-app" : "text-app-subtle"}`}>Więcej</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
}
