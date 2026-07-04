"use client";
import { useState, useMemo } from "react";
import { Emoji } from "./Emoji";
import { PlayerAvatar } from "./PlayerAvatar";
import { computeBreakdown, BreakdownTable } from "./PickBreakdown";

type Pick = {
  userId: string;
  nickname: string;
  avatar: string;
  homeScore: number;
  awayScore: number;
  firstScorerTeam: "HOME" | "AWAY" | "NONE" | null;
  firstGoalPlayer: { id: string; name: string; photoUrl?: string | null; position?: string | null } | null;
  pointsAwarded: number;
  boosted: boolean;
};

type MatchResult = {
  homeScore: number;
  awayScore: number;
  firstScorerTeam: "HOME" | "AWAY" | "NONE";
  firstGoalPlayerId: string | null;
};

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function UserPickSearch({
  picks,
  homeShort,
  awayShort,
  result,
}: { picks: Pick[]; homeShort: string; awayShort: string; result?: MatchResult }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const q = normalize(query.trim());

  const filtered = useMemo(() => {
    if (!q) return picks;
    return picks.filter((p) => normalize(p.nickname).includes(q));
  }, [picks, q]);

  function toggle(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="stat-section">
      <h2>🔎 Czyje typy chcesz zobaczyć?</h2>
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "rgba(241,180,52,0.7)" }}>🔍</span>
        <input
          type="text"
          placeholder="Wpisz nick gracza..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input pl-9 pr-9"
          style={{ background: "rgba(0,0,0,0.4)", borderColor: "rgba(241,180,52,0.25)", color: "white" }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 hover:text-white text-sm w-6 h-6 flex items-center justify-center rounded"
            style={{ color: "rgba(255,255,255,0.5)" }}
            aria-label="Wyczyść"
          >
            ✕
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-center py-6" style={{ color: "rgba(255,255,255,0.55)" }}>
          {query ? `Brak gracza pasującego do "${query}"` : "Brak typów na ten mecz."}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => {
            const scorerTeam = p.firstScorerTeam === "HOME" ? homeShort
              : p.firstScorerTeam === "AWAY" ? awayShort
              : p.firstScorerTeam === "NONE" ? "0:0" : null;
            const finalPts = p.boosted ? p.pointsAwarded * 3 : p.pointsAwarded;
            const isExpanded = expanded.has(p.userId);
            const rows = result ? computeBreakdown({ ...p, firstGoalPlayerId: p.firstGoalPlayer?.id ?? null }, result) : null;

            return (
              <li key={p.userId} className="others-row overflow-hidden flex-col items-stretch !p-0">
                <button
                  type="button"
                  onClick={() => result && toggle(p.userId)}
                  className={`w-full p-3 text-left ${result ? "cursor-pointer hover:bg-white/5 transition" : "cursor-default"}`}
                >
                  <div className="flex items-center gap-3">
                    <Emoji char={p.avatar} size="md" alt={p.nickname} />
                    <div className="font-bold flex-1 text-white">{p.nickname}</div>
                    <div className="text-xl font-black others-score">
                      {p.homeScore}:{p.awayScore}
                    </div>
                    {p.boosted && <span className="chip-boost">x3</span>}
                    <span className={`chip-pts ${finalPts > 0 ? "" : "zero"}`}>{finalPts} pkt</span>
                    {result && (
                      <span className="text-xs transition-transform" style={{ color: "rgba(241,180,52,0.7)", transform: isExpanded ? "rotate(180deg)" : "none" }}>▾</span>
                    )}
                  </div>
                  <div className="mt-2 pl-12 flex flex-wrap items-center gap-2 text-xs">
                    {scorerTeam && (
                      <span className="chip-team-pick">
                        1. ze strzałem: <b>{scorerTeam}</b>
                      </span>
                    )}
                    {p.firstGoalPlayer ? (
                      <div className="chip-scorer-pick">
                        <PlayerAvatar name={p.firstGoalPlayer.name} photoUrl={p.firstGoalPlayer.photoUrl} position={p.firstGoalPlayer.position} size={22} />
                        <span>1. strzelec: <b>{p.firstGoalPlayer.name}</b></span>
                      </div>
                    ) : (
                      <span className="chip-lock">brak strzelca</span>
                    )}
                  </div>
                </button>

                {isExpanded && rows && (
                  <div className="px-3 pb-3 pt-1">
                    <BreakdownTable rows={rows} basePts={p.pointsAwarded} boosted={p.boosted} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
