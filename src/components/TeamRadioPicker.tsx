"use client";
import { useState } from "react";
import { Flag } from "./Flag";

type Option = { value: string; flag: string; label: string };

/**
 * Picker analogiczny do PlayerPickera ale dla pierwszej drużyny ze strzałem.
 * Wartości: "NONE" / "HOME" / "AWAY".
 */
export function TeamRadioPicker({
  name,
  defaultValue,
  home,
  away,
}: {
  name: string;
  defaultValue?: string | null;
  home: { flag: string; shortCode: string };
  away: { flag: string; shortCode: string };
}) {
  const [selected, setSelected] = useState<string>(defaultValue ?? "NONE");
  const [open, setOpen] = useState(false);

  const options: Option[] = [
    { value: "NONE", flag: "", label: "Brak (0:0)" },
    { value: "HOME", flag: home.flag, label: home.shortCode },
    { value: "AWAY", flag: away.flag, label: away.shortCode },
  ];
  const current = options.find((o) => o.value === selected) ?? options[0];

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selected} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex items-center gap-3 text-left"
      >
        {current.flag ? (
          <>
            <Flag emoji={current.flag} size="sm" />
            <span className="font-bold flex-1">{current.label}</span>
          </>
        ) : (
          <span className="text-app-subtle flex-1">{current.label}</span>
        )}
        <span className="text-app-subtle">▾</span>
      </button>
      {open && (
        <div className="mt-2 w-full overflow-hidden rounded-xl border border-app shadow-2xl" style={{ background: "var(--bg)" }}>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { setSelected(o.value); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-wc-red/10 ${selected === o.value ? "bg-wc-red/15" : ""}`}
            >
              {o.flag ? <Flag emoji={o.flag} size="sm" /> : <span className="w-[18px]" />}
              <span className="font-bold">{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
