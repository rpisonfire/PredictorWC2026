import Link from "next/link";
import { Flag } from "./Flag";

type NextMatch = {
  id: string;
  homeTeam: { flag: string; shortCode: string };
  awayTeam: { flag: string; shortCode: string };
  hoursToNext: number;
  missingPicks: number;
  noBoost: boolean;
  currentMd: number | null;
};

type LastMatch = {
  id: string;
  homeTeam: { flag: string; shortCode: string };
  awayTeam: { flag: string; shortCode: string };
  homeScore: number;
  awayScore: number;
  myHome: number;
  myAway: number;
  pts: number;
  boosted: boolean;
  exact: boolean;
};

type Rank = {
  current: number;
  previous: number;
};

/**
 * Stadionowa tablica wynikow - 3 sekcje w jednym pasku.
 * Każda sekcja jest klikalna i prowadzi w odpowiednie miejsce.
 * Ukrywa sekcje gdy brak danych.
 */
export function PersonalScoreboard({
  nextMatch,
  rank,
  lastMatch,
}: {
  nextMatch: NextMatch | null;
  rank: Rank | null;
  lastMatch: LastMatch | null;
}) {
  if (!nextMatch && !rank && !lastMatch) return null;

  return (
    <div className="scoreboard mb-6">
      {nextMatch && (
        <Link href={`/match/${nextMatch.id}`} className="scoreboard-cell scoreboard-next">
          <div className="scoreboard-label">⏰ Najbliższy</div>
          <div className="scoreboard-value">
            <Flag emoji={nextMatch.homeTeam.flag} size="sm" />
            <span className="font-black">{nextMatch.homeTeam.shortCode}</span>
            <span className="text-app-subtle">vs</span>
            <span className="font-black">{nextMatch.awayTeam.shortCode}</span>
            <Flag emoji={nextMatch.awayTeam.flag} size="sm" />
          </div>
          <div className="scoreboard-meta">
            {nextMatch.hoursToNext < 1
              ? `Za ${Math.ceil(nextMatch.hoursToNext * 60)} min`
              : `Za ${Math.floor(nextMatch.hoursToNext)}h ${Math.round((nextMatch.hoursToNext % 1) * 60)}min`}
            {nextMatch.noBoost && nextMatch.currentMd && (
              <span className="text-wc-red font-bold"> · brak boosta</span>
            )}
            {nextMatch.missingPicks > 0 && (
              <span className="text-wc-red font-bold"> · brak {nextMatch.missingPicks} typ.</span>
            )}
          </div>
        </Link>
      )}

      {rank && rank.current !== rank.previous && (() => {
        const delta = rank.previous - rank.current;
        const up = delta > 0;
        return (
          <Link href="/leaderboard" className={`scoreboard-cell ${up ? "scoreboard-up" : "scoreboard-down"}`}>
            <div className="scoreboard-label">{up ? "🚀 Awans" : "📉 Spadek"}</div>
            <div className="scoreboard-value">
              <span className="text-app-subtle text-base">{rank.previous}.</span>
              <span className="text-app-subtle">→</span>
              <span className={`font-black text-2xl score-stadium ${up ? "text-wc-green" : "text-wc-red"}`}>
                {rank.current}.
              </span>
            </div>
            <div className="scoreboard-meta">
              {up ? `o ${delta} ${delta === 1 ? "miejsce" : "miejsca"}` : `o ${-delta} ${-delta === 1 ? "miejsce" : "miejsca"}`}
            </div>
          </Link>
        );
      })()}

      {lastMatch && (
        <Link href={`/match/${lastMatch.id}`} className="scoreboard-cell scoreboard-last">
          <div className="scoreboard-label">
            {lastMatch.exact ? "🎯 Dokładny" : lastMatch.pts >= 5 ? "✨ Ostatni" : lastMatch.pts > 0 ? "👍 Ostatni" : "🧊 Ostatni"}
          </div>
          <div className="scoreboard-value">
            <Flag emoji={lastMatch.homeTeam.flag} size="sm" />
            <span className="font-black score-stadium">{lastMatch.homeScore}:{lastMatch.awayScore}</span>
            <Flag emoji={lastMatch.awayTeam.flag} size="sm" />
          </div>
          <div className="scoreboard-meta flex items-center justify-center gap-1.5">
            <span>Typ {lastMatch.myHome}:{lastMatch.myAway}</span>
            <span className={`score-stadium font-black ${lastMatch.pts > 0 ? "text-wc-green" : "text-app-subtle"}`}>
              {lastMatch.pts > 0 ? `+${lastMatch.pts}` : "0"} pkt
            </span>
            {lastMatch.boosted && <span className="text-wc-gold">⚡</span>}
          </div>
        </Link>
      )}
    </div>
  );
}
