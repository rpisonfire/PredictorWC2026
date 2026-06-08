"use client";
import { useEffect, useState } from "react";

type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem("wcp-theme", theme); } catch {}
}

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    let initial: Theme = "dark";
    try {
      const stored = localStorage.getItem("wcp-theme") as Theme | null;
      if (stored === "dark" || stored === "light") initial = stored;
      else if (window.matchMedia("(prefers-color-scheme: light)").matches) initial = "light";
    } catch {}
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  if (compact) {
    return (
      <button
        onClick={toggle}
        type="button"
        aria-label="Przełącz motyw"
        className="text-xl p-2 rounded-xl hover:bg-app-hover transition"
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
    );
  }

  return (
    <button onClick={toggle} type="button" className="btn-ghost w-full text-sm">
      {theme === "dark" ? "☀️ Tryb jasny" : "🌙 Tryb ciemny"}
    </button>
  );
}

// Skrypt inicjalny żeby nie było "błysku" złego motywu przed hydracją.
export const ThemeInitScript = () => (
  <script
    dangerouslySetInnerHTML={{
      __html: `(function(){try{var t=localStorage.getItem('wcp-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`,
    }}
  />
);
