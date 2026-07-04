/**
 * Wspólna tabelka punktacji za mecz - używana przy typach innych (UserPickSearch)
 * oraz przy własnym typie na stronie meczu po jego zakończeniu.
 */

export type BreakdownPick = {
  homeScore: number;
  awayScore: number;
  firstScorerTeam: "HOME" | "AWAY" | "NONE" | null;
  firstGoalPlayerId: string | null;
};

export type BreakdownResult = {
  homeScore: number;
  awayScore: number;
  firstScorerTeam: "HOME" | "AWAY" | "NONE";
  firstGoalPlayerId: string | null;
};

export type BreakdownRow = { label: string; pts: number; hit: boolean };

const sign = (a: number, b: number) => (a > b ? 1 : a < b ? -1 : 0);

export function computeBreakdown(p: BreakdownPick, r: BreakdownResult): BreakdownRow[] {
  const rows: BreakdownRow[] = [];

  // Kaskada wyniku - liczy się najlepsze trafienie
  if (p.homeScore === r.homeScore && p.awayScore === r.awayScore) {
    rows.push({ label: "Dokładny wynik", pts: 5, hit: true });
  } else if (p.homeScore - p.awayScore === r.homeScore - r.awayScore) {
    rows.push({ label: "Różnica bramek", pts: 3, hit: true });
  } else if (sign(p.homeScore, p.awayScore) === sign(r.homeScore, r.awayScore)) {
    rows.push({ label: "Zwycięzca / remis", pts: 2, hit: true });
  } else {
    rows.push({ label: "Wynik / zwycięzca", pts: 0, hit: false });
  }

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

  rows.push({
    label: "1. drużyna ze strzałem",
    pts: p.firstScorerTeam && p.firstScorerTeam === r.firstScorerTeam ? 2 : 0,
    hit: !!(p.firstScorerTeam && p.firstScorerTeam === r.firstScorerTeam),
  });

  rows.push({
    label: "Pierwszy strzelec",
    pts: p.firstGoalPlayerId && r.firstGoalPlayerId && p.firstGoalPlayerId === r.firstGoalPlayerId ? 5 : 0,
    hit: !!(p.firstGoalPlayerId && r.firstGoalPlayerId && p.firstGoalPlayerId === r.firstGoalPlayerId),
  });

  return rows;
}

export function BreakdownTable({
  rows,
  basePts,
  boosted,
}: {
  rows: BreakdownRow[];
  basePts: number;
  boosted: boolean;
}) {
  const finalPts = boosted ? basePts * 3 : basePts;
  return (
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
        <span className="tabular-nums" style={{ fontFamily: "'Courier New', monospace" }}>{basePts} pkt</span>
      </div>
      {boosted && (
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
  );
}
