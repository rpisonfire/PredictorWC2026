"use client";
import { useState, useMemo } from "react";
import { Emoji } from "./Emoji";
import { PlayerAvatar } from "./PlayerAvatar";

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

const sign = (a: number, b: number) => (a > b ? 1 : a < b ? -1 : 0);

function breakdown(p: Pick, r: MatchResult): { label: string; pts: number; hit: boolean }[] {
  const rows: { label: string; pts: number; hit: boolean }[] = [];

  // Score-related cascade (taken: best)
  if (p.homeScore === r.homeScore && p.awayScore === r.awayScore) {
    rows.push({ label: "Dokładny wynik", pts: 5, hit: true });
  } else if (p.homeScore - p.awayScore === r.homeScore - r.awayScore) {
    rows.push({ label: "Różnica bramek", pts: 3, hit: true });
  } else if (sign(p.homeScore, p.awayScore) === sign(r.homeScore, r.awayScore)) {
    rows.push({ label: "Zwycięzca / remis", pts: 2, hit: true });
  } else {
    rows.push({ label: "Wynik / zwycięzca", pts: 0, hit: false });
  }

  // Per-team goals
  rows.push({
    label: "Bramki gospodarza",
    pts: p.homeScore === r.homeScore ? 1 : 0,
    hit: p.homeScore === r.homeScore,
  });
  rows.push({
    label: "Bramki gości",
    pts: p.awayScore === r.awayScore ? 1 : 0,
    hit: p.awayScore === r.awayScore,
  });

  // First scoring team
  rows.push({
    label: "1. drużyna ze strzałem",
    pts: p.firstScorerTeam && p.firstScorerTeam === r.firstScorerTeam ? 2 : 0,
    hit: !!(p.firstScorerTeam && p.firstScorerTeam === r.firstScorerTeam),
  });

  // First scorer
  rows.push({
    label: "Pierwszy strzelec",
    pts: p.firstGoalPlayer?.id && r.firstGoalPlayerId && p.firstGoalPlayer.id === r.firstGoalPlayerId ? 5 : 0,
    hit: !!(p.firstGoalPlayer?.id && r.firstGoalPlayerId && p.firstGoalPlayer.id === r.firstGoalPlayerId),
  });

  return rows;
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
            const rows = result ? breakdown(p, result) : null;

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
                    <div className="rounded-lg overflow-hidden" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(241,180,52,0.25)" }}>
                      {rows.map((r, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 text-sm" style={{ borderBottom: "1px dashed rgba(241,180,52,0.15)" }}>
                          <div className="flex items-center gap-2">
                            <span style={{ color: r.hit ? "#4ADE80" : "rgba(255,255,255,0.4)" }}>
                              {r.hit ? "✅" : "❌"}
                            </span>
                            <span style={{ color: "rgba(255,255,255,0.85)" }}>{r.label}</span>
                          </div>
                          <span className="font-black tabular-nums" style={{ fontFamily: "'Courier New', monospace", color: r.hit ? "#4ADE80" : "rgba(255,255,255,0.4)" }}>
                            +{r.pts}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-3 py-2 text-sm font-bold" style={{ color: "rgba(255,255,255,0.75)" }}>
                        <span>Razem za mecz</span>
                        <span className="tabular-nums" style={{ fontFamily: "'Courier New', monospace" }}>{p.pointsAwarded} pkt</span>
                      </div>
                      {p.boosted && (
                        <div className="flex items-center justify-between px-3 py-2 text-sm" style={{ background: "rgba(241,180,52,0.08)" }}>
                          <span className="flex items-center gap-2" style={{ color: "#F1B434" }}>
                            <span>⚡</span>
                            Boost x3
                          </span>
                          <span className="font-black tabular-nums" style={{ color: "#F1B434", fontFamily: "'Courier New', monospace" }}>×3</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between px-3 py-2 text-base font-black" style={{ background: "rgba(0,0,0,0.3)" }}>
                        <span style={{ color: "white" }}>SUMA</span>
                        <span className="tabular-nums" style={{ fontFamily: "'Courier New', monospace", color: finalPts > 0 ? "#4ADE80" : "rgba(255,255,255,0.5)", textShadow: finalPts > 0 ? "0 0 8px rgba(74,222,128,0.4)" : "none" }}>
                          {finalPts} pkt
                        </span>
                      </div>
                    </div>
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
