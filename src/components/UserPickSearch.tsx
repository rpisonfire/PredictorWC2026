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
    <div className="card p-5">
      <h2 className="font-black text-lg mb-3">🔎 Czyje typy chcesz zobaczyć?</h2>
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-app-subtle text-sm">🔍</span>
        <input
          type="text"
          placeholder="Wpisz nick gracza..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input pl-9 pr-9"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-app-subtle hover:text-app text-sm w-6 h-6 flex items-center justify-center rounded"
            aria-label="Wyczyść"
          >
            ✕
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-app-subtle text-center py-6">
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
              <li key={p.userId} className="rounded-xl bg-app-hover overflow-hidden">
                <button
                  type="button"
                  onClick={() => result && toggle(p.userId)}
                  className={`w-full p-3 ${result ? "cursor-pointer hover:bg-white/5 transition" : "cursor-default"}`}
                >
                  <div className="flex items-center gap-3">
                    <Emoji char={p.avatar} size="md" alt={p.nickname} />
                    <div className="font-bold flex-1 text-left">{p.nickname}</div>
                    <div className="text-2xl font-black tabular-nums">
                      {p.homeScore}:{p.awayScore}
                    </div>
                    {p.boosted && (
                      <span className="chip bg-wc-gold/20 text-wc-gold">x3 ⚡</span>
                    )}
                    <span className={`chip text-[10px] ${finalPts > 0 ? "bg-wc-green/15 text-wc-green" : "bg-app-hover text-app-subtle"}`}>
                      {finalPts} pkt
                    </span>
                    {result && (
                      <span className={`text-app-subtle text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}>▾</span>
                    )}
                  </div>
                  <div className="mt-2 pl-12 flex flex-wrap items-center gap-2 text-xs">
                    {scorerTeam && (
                      <span className="chip bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        1. drużyna ze strzałem: <b className="ml-1">{scorerTeam}</b>
                      </span>
                    )}
                    {p.firstGoalPlayer ? (
                      <div className="chip bg-app-hover flex items-center gap-1.5 pl-1">
                        <PlayerAvatar name={p.firstGoalPlayer.name} photoUrl={p.firstGoalPlayer.photoUrl} position={p.firstGoalPlayer.position} size={20} />
                        <span>1. strzelec: <b>{p.firstGoalPlayer.name}</b></span>
                      </div>
                    ) : (
                      <span className="chip bg-app-hover text-app-subtle">brak typu na strzelca</span>
                    )}
                  </div>
                </button>

                {isExpanded && rows && (
                  <div className="px-3 pb-3 pt-1">
                    <div className="rounded-lg bg-app-hover/60 border border-app divide-y divide-app">
                      {rows.map((r, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className={r.hit ? "text-wc-green" : "text-app-subtle"}>
                              {r.hit ? "✅" : "❌"}
                            </span>
                            <span>{r.label}</span>
                          </div>
                          <span className={`font-black tabular-nums ${r.hit ? "text-wc-green" : "text-app-subtle"}`}>
                            +{r.pts}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-3 py-2 text-sm font-bold">
                        <span>Razem za mecz</span>
                        <span className="tabular-nums">{p.pointsAwarded} pkt</span>
                      </div>
                      {p.boosted && (
                        <div className="flex items-center justify-between px-3 py-2 text-sm">
                          <span className="flex items-center gap-2">
                            <span className="text-wc-gold">⚡</span>
                            Boost x3
                          </span>
                          <span className="font-black tabular-nums text-wc-gold">×3</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between px-3 py-2 text-base font-black">
                        <span>SUMA</span>
                        <span className={`tabular-nums ${finalPts > 0 ? "text-wc-green" : "text-app-subtle"}`}>
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
