"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Countdown do momentu odsłonięcia typów innych (zwykle kickoff + 45 min).
 * Po dojściu do 0 - router.refresh() żeby strona pobrała typy innych.
 */
export function RevealCountdown({ targetIso }: { targetIso: string }) {
  const router = useRouter();
  const target = new Date(targetIso).getTime();
  const [ms, setMs] = useState(() => Math.max(0, target - Date.now()));

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, target - Date.now());
      setMs(left);
      if (left === 0) {
        // Lekkie opóźnienie + refresh żeby pobrać nową zawartość
        setTimeout(() => router.refresh(), 800);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target, router]);

  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;

  return (
    <div className="reveal-countdown">
      <div className="reveal-countdown-label">TYPY INNYCH ZA</div>
      <div className="reveal-countdown-clock">
        <span>{String(min).padStart(2, "0")}</span>
        <span className="reveal-countdown-colon">:</span>
        <span>{String(sec).padStart(2, "0")}</span>
      </div>
    </div>
  );
}
