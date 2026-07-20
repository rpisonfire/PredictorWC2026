import { XI_SLOTS } from "@/lib/bestXI";
import { PlayerAvatar } from "./PlayerAvatar";

export type LeagueXIEntry = {
  slotKey: string;
  name: string;
  photoUrl: string | null;
  position: string | null;
  teamFlag: string;
  votes: number;
};

/**
 * Read-only boisko 4-3-3 z jedenastką ligi (najczęściej wybierani zawodnicy).
 * Server component - czysta prezentacja, bez interakcji.
 */
export function LeagueXIPitch({ entries }: { entries: LeagueXIEntry[] }) {
  const bySlot = new Map(entries.map((e) => [e.slotKey, e]));
  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        aspectRatio: "3 / 4",
        background: "linear-gradient(180deg, #1a5c2e 0%, #14522a 50%, #0e4423 100%)",
        border: "2px solid rgba(255,255,255,0.25)",
        boxShadow: "0 8px 30px rgba(0,0,0,0.4), inset 0 0 60px rgba(0,0,0,0.25)",
      }}
    >
      <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(0deg, transparent 0, transparent 12.5%, rgba(255,255,255,0.04) 12.5%, rgba(255,255,255,0.04) 25%)" }} />
      <div className="absolute rounded-full" style={{ left: "50%", top: "50%", width: "36%", aspectRatio: "1", transform: "translate(-50%, -50%)", border: "2px solid rgba(255,255,255,0.3)" }} />
      <div className="absolute" style={{ left: 0, right: 0, top: "50%", height: 2, background: "rgba(255,255,255,0.3)" }} />
      <div className="absolute" style={{ left: "22%", right: "22%", bottom: 0, height: "16%", border: "2px solid rgba(255,255,255,0.3)", borderBottom: "none" }} />
      <div className="absolute" style={{ left: "22%", right: "22%", top: 0, height: "16%", border: "2px solid rgba(255,255,255,0.3)", borderTop: "none" }} />

      {XI_SLOTS.map((s) => {
        const e = bySlot.get(s.key);
        return (
          <div
            key={s.key}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: 84 }}
          >
            <div
              className="rounded-full flex items-center justify-center overflow-hidden"
              style={{
                width: 52,
                height: 52,
                background: e ? "rgba(10,14,26,0.9)" : "rgba(255,255,255,0.1)",
                border: e ? "2px solid #F1BF00" : "2px dashed rgba(255,255,255,0.35)",
                boxShadow: e ? "0 0 14px rgba(241,191,0,0.4)" : "none",
              }}
            >
              {e ? (
                <PlayerAvatar name={e.name} photoUrl={e.photoUrl} position={e.position} size={48} />
              ) : (
                <span className="text-white/50 text-xs font-black">{s.label}</span>
              )}
            </div>
            {e && (
              <div
                className="mt-1 px-1.5 py-0.5 rounded text-[10px] font-black leading-tight text-center max-w-full truncate"
                style={{ background: "rgba(0,0,0,0.55)", color: "#F1BF00", fontFamily: "'Courier New', monospace" }}
              >
                {e.teamFlag} {e.name.split(" ").slice(-1)[0]} <span className="text-white/60">({e.votes})</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
