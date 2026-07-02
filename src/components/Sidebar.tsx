"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { Emoji } from "./Emoji";
import { playVuvuzela } from "@/lib/sound";

type Item = { href: string; label: string; emoji: string; gold?: boolean };

export function Sidebar({
  nickname,
  avatar,
  isAdmin,
}: { nickname: string; avatar: string; isAdmin?: boolean }) {
  const items: Item[] = [
    { href: "/dashboard",       label: "Mecze",            emoji: "⚽" },
    { href: "/bracket",         label: "Drabinka",         emoji: "🌳" },
    { href: "/my-predictions",  label: "Moje typy",        emoji: "📋" },
    { href: "/leaderboard",     label: "Ranking",          emoji: "🥇" },
    { href: "/stats",           label: "Statystyki",       emoji: "🌍" },
    { href: "/groups",          label: "Grupy",            emoji: "📊" },
    { href: "/champion",        label: "Typ na mistrza",   emoji: "🏆" },
    { href: "/wrapped",         label: "Wrapped",          emoji: "🎁" },
  ];
  if (isAdmin) items.push({ href: "/admin", label: "Admin", emoji: "🛠️", gold: true });

  // Stan otwarty zapamiętany w localStorage (default: otwarty na desktopie żeby kumple od razu widzieli)
  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  // 🎺 Easter egg: 5 szybkich klików w logo = vuvuzela
  const vuvuClicks = useRef(0);
  const vuvuTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLogoClick = (e: React.MouseEvent) => {
    e.preventDefault(); // nie nawiguj - zbieramy kliki
    vuvuClicks.current++;
    if (vuvuTimer.current) clearTimeout(vuvuTimer.current);
    if (vuvuClicks.current >= 5) {
      vuvuClicks.current = 0;
      playVuvuzela();
    } else {
      vuvuTimer.current = setTimeout(() => { vuvuClicks.current = 0; }, 1500);
    }
  };

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("wcp_sidebar_open");
    if (saved !== null) setOpen(saved === "1");
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem("wcp_sidebar_open", open ? "1" : "0");
  }, [open, mounted]);

  return (
    <>
      {/* Hamburger trigger - zawsze widoczny w lewym rogu */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Zamknij menu" : "Otwórz menu"}
        className="hidden md:flex fixed top-3 left-3 z-40 w-10 h-10 items-center justify-center rounded-xl bg-[var(--card-bg)] border border-[var(--border)] backdrop-blur hover:bg-[var(--hover-bg)] transition"
      >
        <span className="hamburger" data-open={open}>
          <span /><span /><span />
        </span>
      </button>

      {/* Sidebar panel - widoczny tylko gdy open */}
      <aside
        className={`hidden md:flex fixed left-0 top-0 bottom-0 w-60 flex-col bg-[var(--card-bg)] border-r border-[var(--border)] backdrop-blur z-30 sidebar-panel ${open ? "is-open" : "is-closed"}`}
        aria-hidden={!open}
      >
        <Link href="/" className="flex items-center gap-2.5 font-black text-lg pl-16 pr-5 py-5 border-b border-[var(--border)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon.svg" alt="" className="w-8 h-8 rounded-lg shrink-0 select-none" onClick={onLogoClick} />
          <span className="jersey-logo">WC PREDICTOR <span className="text-wc-lime">2026</span></span>
        </Link>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {items.map((it, idx) => (
              <li key={it.href} className="sidebar-item" style={{ animationDelay: open ? `${idx * 60}ms` : "0ms" }}>
                <Link
                  href={it.href}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl overflow-hidden sidebar-link ${it.gold ? "text-wc-gold" : ""}`}
                >
                  <span aria-hidden className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-[var(--accent-bg)] via-[var(--hover-bg)] to-transparent transition-transform duration-500 ease-out" />
                  <span aria-hidden className="absolute left-0 top-1/2 -translate-y-1/2 h-0 group-hover:h-2/3 w-[3px] rounded-r bg-[var(--accent)] transition-all duration-300" />
                  <span className="relative text-lg w-6 text-center transition-transform duration-300 group-hover:scale-110">{it.emoji}</span>
                  <span className="relative font-bold text-sm">{it.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-[var(--border)] flex items-center pr-2 sidebar-item" style={{ animationDelay: open ? `${items.length * 60 + 80}ms` : "0ms" }}>
          <Link href="/profile" className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--hover-bg)] transition flex-1 min-w-0">
            <Emoji char={avatar} size="lg" alt={nickname} />
            <div className="min-w-0">
              <div className="font-bold truncate">{nickname}</div>
              <div className="text-xs text-[var(--text-muted)]">Profil</div>
            </div>
          </Link>
          <ThemeToggle compact />
        </div>
      </aside>
    </>
  );
}
