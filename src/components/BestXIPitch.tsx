"use client";
import { useMemo, useState, useTransition } from "react";
import { XI_SLOTS, BUCKET_LABEL, SLOT_ALLOWED_BUCKETS, type PositionBucket } from "@/lib/bestXI";
import { PlayerAvatar } from "./PlayerAvatar";
import { playSwoosh } from "@/lib/sound";

export type XIPlayer = {
  id: string;
  name: string;
  photoUrl: string | null;
  position: string | null;
  teamCode: string;
  teamFlag: string;
};

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function BestXIPitch({
  playersByBucket,
  initialPicks,
  saveAction,
}: {
  playersByBucket: Record<PositionBucket, XIPlayer[]>;
  initialPicks: Record<string, string>; // slotKey -> playerId
  saveAction: (formData: FormData) => Promise<{ ok: boolean }>;
}) {
  const [picks, setPicks] = useState<Record<string, string>>(initialPicks);
  const [openSlot, setOpenSlot] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const playerById = useMemo(() => {
    const m = new Map<string, XIPlayer>();
    for (const list of Object.values(playersByBucket)) for (const p of list) m.set(p.id, p);
    return m;
  }, [playersByBucket]);

  const slot = XI_SLOTS.find((s) => s.key === openSlot) ?? null;
  const pickedIds = new Set(Object.values(picks));
  const candidates = useMemo(() => {
    if (!slot) return [];
    const q = normalize(query.trim());
    // Naturalna pozycja slotu najpierw, potem wymienne (MID<->FWD)
    const pool = SLOT_ALLOWED_BUCKETS[slot.bucket].flatMap((b) => playersByBucket[b]);
    return pool
      .filter((p) => !pickedIds.has(p.id) || picks[slot.key] === p.id)
      .filter((p) => !q || normalize(p.name).includes(q) || normalize(p.teamCode).includes(q))
      .slice(0, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot, query, picks, playersByBucket]);

  const complete = XI_SLOTS.every((s) => picks[s.key]);

  const save = () => {
    startTransition(async () => {
      try {
        const fd = new FormData();
        for (const [k, v] of Object.entries(picks)) fd.set(k, v);
        const res = await saveAction(fd);
        if (!res.ok) throw new Error();
        setStatus("saved");
        playSwoosh();
        setTimeout(() => setStatus("idle"), 3000);
      } catch {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3500);
      }
    });
  };

  return (
    <div>
      {/* Boisko - pionowe, GK na dole */}
      <div
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          aspectRatio: "3 / 4",
          background: "linear-gradient(180deg, #1a5c2e 0%, #14522a 50%, #0e4423 100%)",
          border: "2px solid rgba(255,255,255,0.25)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.4), inset 0 0 60px rgba(0,0,0,0.25)",
        }}
      >
        {/* Pasy trawy */}
        <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(0deg, transparent 0, transparent 12.5%, rgba(255,255,255,0.04) 12.5%, rgba(255,255,255,0.04) 25%)" }} />
        {/* Linie boiska */}
        <div className="absolute rounded-full" style={{ left: "50%", top: "50%", width: "36%", aspectRatio: "1", transform: "translate(-50%, -50%)", border: "2px solid rgba(255,255,255,0.3)" }} />
        <div className="absolute" style={{ left: 0, right: 0, top: "50%", height: 2, background: "rgba(255,255,255,0.3)" }} />
        {/* Pole karne (dolne, przy GK) */}
        <div className="absolute" style={{ left: "22%", right: "22%", bottom: 0, height: "16%", border: "2px solid rgba(255,255,255,0.3)", borderBottom: "none" }} />
        <div className="absolute" style={{ left: "36%", right: "36%", bottom: 0, height: "7%", border: "2px solid rgba(255,255,255,0.25)", borderBottom: "none" }} />
        {/* Pole karne górne */}
        <div className="absolute" style={{ left: "22%", right: "22%", top: 0, height: "16%", border: "2px solid rgba(255,255,255,0.3)", borderTop: "none" }} />

        {/* Sloty zawodników */}
        {XI_SLOTS.map((s) => {
          const p = picks[s.key] ? playerById.get(picks[s.key]) : null;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => { setOpenSlot(s.key); setQuery(""); }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group"
              style={{ left: `${s.x}%`, top: `${s.y}%`, width: 84 }}
            >
              <div
                className="rounded-full flex items-center justify-center transition-transform group-hover:scale-110 group-active:scale-95"
                style={{
                  width: 52,
                  height: 52,
                  background: p ? "rgba(10,14,26,0.9)" : "rgba(255,255,255,0.12)",
                  border: p ? "2px solid #F1BF00" : "2px dashed rgba(255,255,255,0.5)",
                  boxShadow: p ? "0 0 14px rgba(241,191,0,0.4)" : "none",
                  overflow: "hidden",
                }}
              >
                {p ? (
                  <PlayerAvatar name={p.name} photoUrl={p.photoUrl} position={p.position} size={48} />
                ) : (
                  <span className="text-white/80 text-lg font-black">+</span>
                )}
              </div>
              <div
                className="mt-1 px-1.5 py-0.5 rounded text-[10px] font-black leading-tight text-center max-w-full truncate"
                style={{
                  background: "rgba(0,0,0,0.55)",
                  color: p ? "#F1BF00" : "rgba(255,255,255,0.75)",
                  fontFamily: "'Courier New', monospace",
                }}
              >
                {p ? `${p.teamFlag} ${p.name.split(" ").slice(-1)[0]}` : s.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Zapis */}
      <button
        type="button"
        onClick={save}
        disabled={!complete || pending}
        className="btn-primary w-full mt-4"
        style={{ opacity: !complete || pending ? 0.6 : 1 }}
      >
        {pending ? "⏳ Zapisuję..." : complete ? "Zapisz jedenastkę ⭐" : `Wybierz wszystkich (${Object.keys(picks).length}/11)`}
      </button>

      {status !== "idle" && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-2.5 text-sm font-black uppercase tracking-wider"
          style={{
            background: "linear-gradient(180deg, #0a0e1a 0%, #050810 100%)",
            border: `1px solid ${status === "saved" ? "rgba(166,226,46,0.4)" : "rgba(228,0,43,0.5)"}`,
            color: status === "saved" ? "#A6E22E" : "#FF5964",
            fontFamily: "'Courier New', monospace",
          }}
        >
          {status === "saved" ? "✔ Jedenastka zapisana" : "⚠ Błąd zapisu"}
        </div>
      )}

      {/* Picker - bottom sheet */}
      {slot && (
        <>
          <button
            aria-label="Zamknij"
            onClick={() => setOpenSlot(null)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <div className="fixed left-0 right-0 bottom-0 z-50 max-h-[70vh] flex flex-col rounded-t-2xl overflow-hidden" style={{ background: "linear-gradient(180deg, #0a0e1a 0%, #050810 100%)", border: "1px solid rgba(241,180,52,0.3)", borderBottom: "none" }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(241,180,52,0.2)" }}>
              <div className="font-black text-white">
                {BUCKET_LABEL[slot.bucket]} <span className="text-xs" style={{ color: "rgba(241,180,52,0.7)", fontFamily: "'Courier New', monospace" }}>· {slot.label}</span>
              </div>
              <button type="button" onClick={() => setOpenSlot(null)} className="text-white/60 hover:text-white w-8 h-8">✕</button>
            </div>
            <div className="p-3">
              <input
                autoFocus
                type="text"
                placeholder="Szukaj zawodnika lub kraju..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input"
              />
            </div>
            <ul className="overflow-y-auto flex-1 px-3 pb-6 space-y-1">
              {picks[slot.key] && (
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setPicks((prev) => { const n = { ...prev }; delete n[slot.key]; return n; });
                      setOpenSlot(null);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold"
                    style={{ background: "rgba(228,0,43,0.15)", color: "#FF5964", border: "1px solid rgba(228,0,43,0.3)" }}
                  >
                    🗑 Usuń z tej pozycji
                  </button>
                </li>
              )}
              {candidates.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setPicks((prev) => ({ ...prev, [slot.key]: p.id }));
                      setOpenSlot(null);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition text-left"
                  >
                    <PlayerAvatar name={p.name} photoUrl={p.photoUrl} position={p.position} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white truncate">{p.name}</div>
                      <div className="text-xs text-white/50">{p.teamFlag} {p.teamCode}</div>
                    </div>
                    {picks[slot.key] === p.id && <span style={{ color: "#F1BF00" }}>✔</span>}
                  </button>
                </li>
              ))}
              {candidates.length === 0 && (
                <li className="text-center text-sm text-white/50 py-6">Brak zawodników pasujących do wyszukiwania</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
