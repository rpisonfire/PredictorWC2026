export function isLive(kickoff: Date, finished: boolean): boolean {
  if (finished) return false;
  const now = Date.now();
  const k = kickoff.getTime();
  // Mecz "live" od gwizdka do +2h (przerwa wliczona)
  return now >= k && now < k + 2 * 60 * 60 * 1000;
}
