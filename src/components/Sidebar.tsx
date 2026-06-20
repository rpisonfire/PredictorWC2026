import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { Emoji } from "./Emoji";

type Item = { href: string; label: string; emoji: string; gold?: boolean };

export function Sidebar({
  nickname,
  avatar,
  isAdmin,
}: { nickname: string; avatar: string; isAdmin?: boolean }) {
  const items: Item[] = [
    { href: "/dashboard",       label: "Mecze",            emoji: "⚽" },
    { href: "/my-predictions",  label: "Moje typy",        emoji: "📋" },
    { href: "/champion",        label: "Typ na mistrza",   emoji: "🏆" },
    { href: "/groups",          label: "Grupy",            emoji: "📊" },
    { href: "/bracket",         label: "Drabinka",         emoji: "🌳" },
    { href: "/leaderboard",     label: "Ranking",          emoji: "🥇" },
    { href: "/compare",         label: "Pojedynek",        emoji: "⚔️" },
    { href: "/stats",           label: "Statystyki",       emoji: "🌍" },
    { href: "/leagues",         label: "Ligi",             emoji: "🏟️" },
  ];
  if (isAdmin) items.push({ href: "/admin", label: "Admin", emoji: "🛠️", gold: true });

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-60 flex-col bg-[var(--card-bg)] border-r border-[var(--border)] backdrop-blur z-30">
      <Link href="/" className="flex items-center gap-2 font-black text-lg px-5 py-5 border-b border-[var(--border)]">
        <span className="text-2xl leading-none ball-spin">⚽</span>
        <span className="jersey-logo">WC PREDICTOR <span className="text-wc-lime">2026</span></span>
      </Link>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {items.map((it) => (
            <li key={it.href}>
              <Link href={it.href} className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl overflow-hidden transition-all duration-300 ${it.gold ? "text-wc-gold" : ""}`}>
                <span aria-hidden className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-[var(--accent-bg)] via-[var(--hover-bg)] to-transparent transition-transform duration-500 ease-out" />
                <span aria-hidden className="absolute left-0 top-1/2 -translate-y-1/2 h-0 group-hover:h-2/3 w-[3px] rounded-r bg-[var(--accent)] transition-all duration-300" />
                <span className="relative text-lg w-6 text-center transition-transform duration-300 group-hover:scale-110">{it.emoji}</span>
                <span className="relative font-bold text-sm transition-transform duration-300 group-hover:translate-x-0.5">{it.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-[var(--border)] flex items-center pr-2">
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
  );
}
