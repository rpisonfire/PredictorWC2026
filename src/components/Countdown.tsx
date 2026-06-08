"use client";
import { useEffect, useState } from "react";

const TARGET = new Date("2026-06-11T21:00:00+02:00"); // 11 czerwca 2026, 21:00 czasu polskiego - Estadio Azteca

function diff(target: Date) {
  const ms = Math.max(0, target.getTime() - Date.now());
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return { days, hours, minutes, seconds, done: ms === 0 };
}

export function Countdown() {
  const [t, setT] = useState(() => diff(TARGET));
  useEffect(() => {
    const id = setInterval(() => setT(diff(TARGET)), 1000);
    return () => clearInterval(id);
  }, []);

  if (t.done) {
    return (
      <div className="card p-6 text-center">
        <div className="text-2xl font-black text-wc-gold">🎉 Mundial rozpoczęty!</div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="text-xs uppercase tracking-wider text-app-subtle mb-3 text-center">
        Do meczu otwarcia · 🇲🇽 Estadio Banorte, Ciudad de México
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Cell value={t.days}    label="dni" />
        <Cell value={t.hours}   label="godz" />
        <Cell value={t.minutes} label="min" />
        <Cell value={t.seconds} label="sek" pulse />
      </div>
    </div>
  );
}

function Cell({ value, label, pulse }: { value: number; label: string; pulse?: boolean }) {
  const str = String(value).padStart(2, "0");
  return (
    <div className="rounded-xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-app p-3 text-center">
      <div
        className={`text-4xl md:text-5xl font-black tabular-nums tracking-tight ${pulse ? "text-wc-red" : "text-white"}`}
        style={pulse ? { animation: "wcPulse 1s ease-in-out infinite" } : undefined}
      >
        {str}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-app-subtle mt-1">{label}</div>
      <style>{`@keyframes wcPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.55 } }`}</style>
    </div>
  );
}
