"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function diff(target: Date) {
  const ms = Math.max(0, target.getTime() - Date.now());
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return { days, hours, minutes, seconds, done: ms === 0, ms };
}

/**
 * Countdown do zamknięcia wyboru typu na mistrza turnieju.
 * Po dojściu do 0 - router.refresh() żeby SSR zwrócił locked state.
 */
export function ChampionLockCountdown({ lockAtIso }: { lockAtIso: string }) {
  const router = useRouter();
  const target = new Date(lockAtIso);
  const [t, setT] = useState(() => diff(target));

  useEffect(() => {
    const id = setInterval(() => {
      const next = diff(target);
      setT(next);
      if (next.done) {
        setTimeout(() => router.refresh(), 800);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [lockAtIso, router]);

  if (t.done) return null;

  return (
    <div className="champion-countdown">
      <div className="champion-countdown-label">⏱ DO ZAMKNIĘCIA WYBORU</div>
      <div className="champion-countdown-cells">
        <Cell value={t.days} label="DNI" />
        <Cell value={t.hours} label="GODZ" />
        <Cell value={t.minutes} label="MIN" />
        <Cell value={t.seconds} label="SEK" pulse />
      </div>
    </div>
  );
}

function Cell({ value, label, pulse }: { value: number; label: string; pulse?: boolean }) {
  return (
    <div className="champion-countdown-cell">
      <div className={`champion-countdown-value ${pulse ? "is-pulse" : ""}`}>
        {String(value).padStart(2, "0")}
      </div>
      <div className="champion-countdown-cell-label">{label}</div>
    </div>
  );
}
