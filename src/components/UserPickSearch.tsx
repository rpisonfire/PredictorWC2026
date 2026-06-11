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
  firstGoalPlayer: { name: string; photoUrl?: string | null; position?: string | null } | null;
  pointsAwarded: number;
  boosted: boolean;
};

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function UserPickSearch({
  picks,
  homeShort,
  awayShort,
}: { picks: Pick[]; homeShort: string; awayShort: string }) {
  const [query, setQuery] = useState("");
  const q = normalize(query.trim());

  const filtered = useMemo(() => {
    if (!q) return picks;
    return picks.filter((p) => normalize(p.nickname).includes(q));
  }, [picks, q]);

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
            return (
              <li key={p.userId} className="rounded-xl bg-app-hover p-3">
                <div className="flex items-center gap-3">
                  <Emoji char={p.avatar} size="md" alt={p.nickname} />
                  <div className="font-bold flex-1">{p.nickname}</div>
                  <div className="text-2xl font-black tabular-nums">
                    {p.homeScore}:{p.awayScore}
                  </div>
                  {p.boosted && (
                    <span className="chip bg-wc-gold/20 text-wc-gold">x3 ⚡</span>
                  )}
                  <span className={`chip text-[10px] ${p.pointsAwarded > 0 ? "bg-wc-green/15 text-wc-green" : "bg-app-hover text-app-subtle"}`}>
                    {p.boosted ? p.pointsAwarded * 3 : p.pointsAwarded} pkt
                  </span>
                </div>
                <div className="mt-2 pl-12 flex flex-wrap items-center gap-2 text-xs">
                  {scorerTeam && (
                    <span className="chip bg-wc-blue/15 text-wc-blue">
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
