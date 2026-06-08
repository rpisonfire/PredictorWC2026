"use client";
import { useEffect, useState } from "react";

type Perm = "default" | "granted" | "denied" | "unsupported";

export function NotificationsButton() {
  const [perm, setPerm] = useState<Perm>("default");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) { setPerm("unsupported"); return; }
    setPerm(Notification.permission as Perm);
  }, []);

  async function enable() {
    if (perm === "unsupported") return;
    const result = await Notification.requestPermission();
    setPerm(result as Perm);
    if (result === "granted") {
      new Notification("WC Predictor 2026", {
        body: "🔔 Powiadomienia włączone - będziemy przypominać o meczach.",
        icon: "/icons/icon.svg",
      });
    }
  }

  if (perm === "unsupported") {
    return <div className="text-xs text-app-subtle">Twoja przeglądarka nie wspiera powiadomień.</div>;
  }
  if (perm === "granted") {
    return <div className="text-sm text-wc-green">🔔 Powiadomienia włączone ✓</div>;
  }
  if (perm === "denied") {
    return <div className="text-xs text-app-subtle">Powiadomienia zablokowane w przeglądarce. Odblokuj w ustawieniach strony.</div>;
  }
  return (
    <button onClick={enable} type="button" className="btn-ghost w-full text-sm">
      🔔 Włącz powiadomienia
    </button>
  );
}
