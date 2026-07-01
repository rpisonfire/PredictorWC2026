"use client";
import { useEffect, useState } from "react";
import { isSoundEnabled, setSoundEnabled, playSwoosh } from "@/lib/sound";

export function SoundToggle() {
  const [enabled, setEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setEnabled(isSoundEnabled());
  }, []);

  if (!mounted) return null;

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setSoundEnabled(next);
    if (next) {
      // Preview - zagraj swoosh żeby user usłyszał od razu
      setTimeout(() => playSwoosh(), 50);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border transition ${
        enabled ? "bg-wc-green/10 border-wc-green/40" : "bg-app-hover border-app"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{enabled ? "🔊" : "🔇"}</span>
        <div className="text-left">
          <div className="font-bold text-sm">Dźwięk zapisu</div>
          <div className="text-xs text-app-subtle">
            {enabled ? "Swoosh po zapisaniu typu" : "Wyciszony"}
          </div>
        </div>
      </div>
      <div
        className={`w-11 h-6 rounded-full relative transition ${
          enabled ? "bg-wc-green" : "bg-app-hover border border-app"
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
            enabled ? "left-5" : "left-0.5"
          }`}
        />
      </div>
    </button>
  );
}
