"use client";
import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let reg: ServiceWorkerRegistration | null = null;

    const onLoad = async () => {
      try {
        reg = await navigator.serviceWorker.register("/sw.js");

        // 1. Force-check update przy każdej rejestracji (po loadzie strony)
        reg.update().catch(() => {});

        // 2. Co 30 min sprawdzaj czy nie ma nowej wersji SW
        const interval = setInterval(() => reg?.update().catch(() => {}), 30 * 60 * 1000);

        // 3. Gdy nowy SW przejmie kontrolę, wymuś reload strony
        // (sw.js ma skipWaiting + clients.claim, więc dzieje się szybko)
        let reloaded = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (reloaded) return;
          reloaded = true;
          window.location.reload();
        });

        return () => clearInterval(interval);
      } catch {}
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    // 4. Hard recovery: gdy chunk się nie załaduje (cache zatruty),
    // wyczyść cache + unregister SW + reload
    const onChunkError = (e: ErrorEvent | PromiseRejectionEvent) => {
      const msg = ("reason" in e ? String(e.reason?.message ?? e.reason) : e.message) ?? "";
      if (!/ChunkLoadError|Loading chunk|Failed to fetch dynamically imported/.test(msg)) return;
      const tried = sessionStorage.getItem("__sw_recovery_tried");
      if (tried) return; // tylko raz na sesję
      sessionStorage.setItem("__sw_recovery_tried", "1");
      Promise.all([
        navigator.serviceWorker.getRegistrations().then((rs) => Promise.all(rs.map((r) => r.unregister()))),
        caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))),
      ]).finally(() => window.location.reload());
    };
    window.addEventListener("error", onChunkError);
    window.addEventListener("unhandledrejection", onChunkError);
    return () => {
      window.removeEventListener("error", onChunkError);
      window.removeEventListener("unhandledrejection", onChunkError);
    };
  }, []);
  return null;
}
