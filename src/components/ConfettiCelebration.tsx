"use client";
import { useEffect } from "react";
import confetti from "canvas-confetti";

/**
 * Wyskakujące konfetti przy trafionym dokładnym wyniku.
 * Pamięta przez localStorage że już wystrzelone - żeby nie palić przy każdym odświeżeniu.
 */
export function ConfettiCelebration({ matchId, gold }: { matchId: string; gold?: boolean }) {
  useEffect(() => {
    const key = `wcp-confetti-${matchId}`;
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {}

    const colors = gold
      ? ["#F1B434", "#E4002B", "#A6E22E", "#0A3161"]
      : ["#E4002B", "#A6E22E", "#0A3161", "#006847"];

    // Wystrzał z dwóch stron jak na meczu po golu
    const duration = 2500;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();

    // Jeden duży wybuch z góry
    confetti({
      particleCount: 80,
      spread: 100,
      startVelocity: 35,
      origin: { y: 0.4 },
      colors,
    });
  }, [matchId, gold]);

  return null;
}
