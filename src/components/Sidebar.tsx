import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { Emoji } from "./Emoji";
import { getT, type DictKey } from "@/lib/i18n";

type Item = { href: string; key: DictKey; emoji: string; gold?: boolean };

export async function Sidebar({
  nickname,
  avatar,
  isAdmin,
}: { nickname: string; avatar: string; isAdmin?: boolean }) {
  const t = await getT();
  const items: Item[] = [
    { href: "/dashboard",       key: "nav.matches",        emoji: "⚽" },
    { href: "/my-predictions",  key: "nav.myPredictions",  emoji: "📋" },
    { href: "/champion",        key: "nav.champion",       emoji: "🏆" },
    { href: "/groups",          key: "nav.groups",         emoji: "📊" },
    { href: "/bracket",         key: "nav.bracket",        emoji: "🌳" },
    { href: "/leaderboard",     key: "nav.ranking",        emoji: "🥇" },
    { href: "/stats",           key: "nav.stats",          emoji: "🌍" },
    { href: "/leagues",         key: "nav.leagues",        emoji: "🏟️" },
  ];
  if (isAdmin) items.push({ href: "/admin", key: "nav.admin", emoji: "🛠️", gold: true });

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
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl overflow-hidden transition-all duration-300 ${it.gold ? "text-wc-gold" : ""}`}
              >
                <span aria-hidden className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-[var(--accent-bg)] via-[var(--hover-bg)] to-transparent transition-transform duration-500 ease-out" />
                <span aria-hidden className="absolute left-0 top-1/2 -translate-y-1/2 h-0 group-hover:h-2/3 w-[3px] rounded-r bg-[var(--accent)] transition-all duration-300" />
                <span className="relative text-lg w-6 text-center transition-transform duration-300 group-hover:scale-110">{it.emoji}</span>
                <span className="relative font-bold text-sm transition-transform duration-300 group-hover:translate-x-0.5">{t(it.key)}</span>
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
            <div className="text-xs text-[var(--text-muted)]">{t("nav.profile")}</div>
          </div>
        </Link>
        <ThemeToggle compact />
      </div>
    </aside>
  );
}
