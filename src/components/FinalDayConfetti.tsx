"use client";
import { useEffect } from "react";
import confetti from "canvas-confetti";

/**
 * Złote konfetti w dniu finału - odpala się raz na sesję przeglądarki.
 */
export function FinalDayConfetti() {
  useEffect(() => {
    if (sessionStorage.getItem("wcp_final_confetti") === "1") return;
    sessionStorage.setItem("wcp_final_confetti", "1");
    const gold = ["#FFD700", "#F1B434", "#FFE28C", "#FFFFFF"];
    const t = setTimeout(() => {
      confetti({ particleCount: 90, spread: 75, origin: { y: 0.25 }, colors: gold });
      setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.4 }, colors: gold }), 250);
      setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.4 }, colors: gold }), 500);
    }, 400);
    return () => clearTimeout(t);
  }, []);
  return null;
}
