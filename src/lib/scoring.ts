// Scoring engine - WC 2026 Predictor
// 5 pts exact score | 3 pts goal difference | 2 pts winner only
// 2 pts first team to score | 5 pts exact first goalscorer
// x3 boost multiplier applied per matchday on one chosen match.

export type PredictionInput = {
  homeScore: number;
  awayScore: number;
  firstScorerTeam: "HOME" | "AWAY" | "NONE" | null;
  firstGoalPlayerId: string | null;
};

export type MatchResult = {
  homeScore: number;
  awayScore: number;
  firstScorerTeam: "HOME" | "AWAY" | "NONE";
  firstGoalPlayerId: string | null;
};

const sign = (a: number, b: number) => (a > b ? 1 : a < b ? -1 : 0);

export function scorePrediction(p: PredictionInput, r: MatchResult): number {
  let pts = 0;

  // Score-related (mutually exclusive: take the best tier)
  if (p.homeScore === r.homeScore && p.awayScore === r.awayScore) {
    pts += 5;
  } else if (p.homeScore - p.awayScore === r.homeScore - r.awayScore) {
    pts += 3; // exact goal difference, e.g. predicted 2-1, real 3-2
  } else if (sign(p.homeScore, p.awayScore) === sign(r.homeScore, r.awayScore)) {
    pts += 2; // correct winner or draw
  }

  // First team to score
  if (p.firstScorerTeam && p.firstScorerTeam === r.firstScorerTeam) {
    pts += 2;
  }

  // Exact first goalscorer
  if (
    p.firstGoalPlayerId &&
    r.firstGoalPlayerId &&
    p.firstGoalPlayerId === r.firstGoalPlayerId
  ) {
    pts += 5;
  }

  return pts;
}

export function applyBoost(points: number, boosted: boolean): number {
  return boosted ? points * 3 : points;
}
