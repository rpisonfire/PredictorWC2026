"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { PlayerAvatar } from "./PlayerAvatar";

type PlayerOpt = { id: string; name: string; photoUrl?: string | null; number?: number | null; position?: string | null };
type TeamGroup = { name: string; flag: string; players: PlayerOpt[] };

// Usuwanie polskich znaków i akcentów dla porównywania (np. "Zieliński" matches "zielinski")
function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function PlayerPicker({
  name,
  defaultValue,
  groups,
}: {
  name: string;
  defaultValue?: string | null;
  groups: TeamGroup[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>(defaultValue ?? "");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const all = groups.flatMap((g) => g.players);
  const current = all.find((p) => p.id === selected);

  const q = normalize(query.trim());
  const filteredGroups = useMemo(() => {
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        players: g.players.filter((p) => normalize(p.name).includes(q)),
      }))
      .filter((g) => g.players.length > 0);
  }, [groups, q]);

  // Auto-focus search on open
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selected} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex items-center gap-3 text-left"
      >
        {current ? (
          <>
            <PlayerAvatar name={current.name} photoUrl={current.photoUrl} position={current.position} size={32} />
            <span className="font-bold flex-1">{current.name}</span>
            {current.number != null && <span className="text-app-subtle text-sm">#{current.number}</span>}
          </>
        ) : (
          <span className="text-app-subtle flex-1">- wybierz strzelca -</span>
        )}
        <span className="text-app-subtle">▾</span>
      </button>

      {open && (
        <div className="mt-2 w-full max-h-96 overflow-hidden rounded-xl border border-app shadow-2xl flex flex-col" style={{ background: "var(--bg)" }}>
          {/* Search */}
          <div className="p-2 border-b border-app sticky top-0" style={{ background: "var(--bg)" }}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-app-subtle text-sm">🔍</span>
              <input
                ref={searchRef}
                type="text"
                placeholder="Szukaj zawodnika..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2 rounded-lg outline-none focus:ring-2 focus:ring-wc-red/30 text-sm"
                style={{ background: "var(--input-bg)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); searchRef.current?.focus(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-app-subtle hover:text-app text-sm w-6 h-6 flex items-center justify-center rounded"
                  aria-label="Wyczyść"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {!query && (
              <button
                type="button"
                onClick={() => { setSelected(""); setOpen(false); }}
                className="w-full text-left px-4 py-2 text-app-subtle hover:bg-app-hover border-b border-app"
              >
                - nie wybieram -
              </button>
            )}

            {filteredGroups.length === 0 && (
              <div className="p-6 text-center text-app-subtle text-sm">
                Brak zawodników pasujących do "{query}"
              </div>
            )}

            {filteredGroups.map((g) => (
              <div key={g.name}>
                <div className="px-4 py-2 text-xs uppercase tracking-wider text-app-subtle bg-app-hover sticky top-0">
                  {g.flag} {g.name}
                </div>
                {g.players.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setSelected(p.id); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-wc-red/10 ${selected === p.id ? "bg-wc-red/15" : ""}`}
                  >
                    <PlayerAvatar name={p.name} photoUrl={p.photoUrl} position={p.position} size={32} />
                    <span className="font-bold flex-1 text-left">{p.name}</span>
                    {p.number != null && <span className="text-app-subtle text-sm">#{p.number}</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
