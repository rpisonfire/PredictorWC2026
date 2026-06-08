import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

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
    { href: "/stats",           label: "Statystyki",       emoji: "🌍" },
    { href: "/leagues",         label: "Ligi",             emoji: "🏟️" },
  ];
  if (isAdmin) items.push({ href: "/admin", label: "Admin", emoji: "🛠️", gold: true });

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-60 flex-col bg-[var(--card-bg)] border-r border-[var(--border)] backdrop-blur z-30">
      <Link href="/" className="flex items-center gap-2 font-black text-lg px-5 py-5 border-b border-[var(--border)]">
        <span className="text-2xl leading-none">⚽</span>
        <span>WC Predictor <span className="text-wc-lime">2026</span></span>
      </Link>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {items.map((it) => (
            <li key={it.href}>
              <Link
                href={it.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--hover-bg)] transition ${it.gold ? "text-wc-gold" : ""}`}
              >
                <span className="text-lg w-6 text-center">{it.emoji}</span>
                <span className="font-bold text-sm">{it.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-[var(--border)] flex items-center pr-2">
        <Link
          href="/profile"
          className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--hover-bg)] transition flex-1 min-w-0"
        >
          <span className="text-2xl">{avatar}</span>
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
