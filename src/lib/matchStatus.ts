import { isKnockoutStage } from "./stageLabel";

export function isLive(kickoff: Date, finished: boolean, stage?: string): boolean {
  if (finished) return false;
  const now = Date.now();
  const k = kickoff.getTime();
  // Faza grupowa: 90 min + przerwa + bufor = 2h
  // Faza pucharowa: 90 min + dogrywka 30 min + karne + przerwy = 3h
  const windowMs = stage && isKnockoutStage(stage)
    ? 3 * 60 * 60 * 1000
    : 2 * 60 * 60 * 1000;
  return now >= k && now < k + windowMs;
}
