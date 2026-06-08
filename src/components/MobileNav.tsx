import Link from "next/link";

type NavItem = { href: string; label: string; emoji: string };

const ITEMS: NavItem[] = [
  { href: "/dashboard",      label: "Mecze",   emoji: "⚽" },
  { href: "/groups",         label: "Grupy",   emoji: "📊" },
  { href: "/leaderboard",    label: "Ranking", emoji: "🏆" },
  { href: "/my-predictions", label: "Typy",    emoji: "📋" },
  { href: "/profile",        label: "Profil",  emoji: "👤" },
];

export function MobileNav({ isAdmin }: { isAdmin?: boolean }) {
  const items = isAdmin ? [...ITEMS, { href: "/admin", label: "Admin", emoji: "🛠️" }] : ITEMS;
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--header-bg)] backdrop-blur border-t border-app pb-[env(safe-area-inset-bottom)]">
      <ul className={`grid gap-0`} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((it) => (
          <li key={it.href} className="text-center">
            <Link
              href={it.href}
              className="flex flex-col items-center gap-0.5 py-2.5 active:bg-app-hover"
            >
              <span className="text-xl leading-none">{it.emoji}</span>
              <span className="text-[10px] uppercase tracking-wider text-app-muted">{it.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
