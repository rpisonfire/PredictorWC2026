"use client";
import { useState } from "react";
import { PlayerAvatar } from "./PlayerAvatar";

type PlayerOpt = { id: string; name: string; photoUrl?: string | null; number?: number | null };
type TeamGroup = { name: string; flag: string; players: PlayerOpt[] };

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
  const all = groups.flatMap((g) => g.players);
  const current = all.find((p) => p.id === selected);

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
            <PlayerAvatar name={current.name} photoUrl={current.photoUrl} size={32} />
            <span className="font-bold flex-1">{current.name}</span>
            {current.number != null && <span className="text-white/40 text-sm">#{current.number}</span>}
          </>
        ) : (
          <span className="text-white/40 flex-1">- wybierz strzelca -</span>
        )}
        <span className="text-white/40">▾</span>
      </button>

      {open && (
        <div className="mt-2 w-full max-h-80 overflow-y-auto rounded-xl bg-wc-ink border border-white/10 shadow-2xl">
          <button
            type="button"
            onClick={() => { setSelected(""); setOpen(false); }}
            className="w-full text-left px-4 py-2 text-white/50 hover:bg-white/5 border-b border-white/5"
          >
            - nie wybieram -
          </button>
          {groups.map((g) => (
            <div key={g.name}>
              <div className="px-4 py-2 text-xs uppercase tracking-wider text-white/40 bg-white/5 sticky top-0">
                {g.flag} {g.name}
              </div>
              {g.players.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setSelected(p.id); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-wc-red/10 ${selected === p.id ? "bg-wc-red/15" : ""}`}
                >
                  <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size={32} />
                  <span className="font-bold flex-1 text-left">{p.name}</span>
                  {p.number != null && <span className="text-white/40 text-sm">#{p.number}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
