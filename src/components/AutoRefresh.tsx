"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Odświeża route co `intervalSec` sekund - tylko gdy tab jest widoczny.
 * Oszczędność limitów Vercel/Neon: zminimalizowana karta lub przełączona
 * w tle przerywa refreshe; po powrocie wznawia.
 */
export function AutoRefresh({ intervalSec = 60 }: { intervalSec?: number }) {
  const router = useRouter();
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (id) return;
      id = setInterval(() => router.refresh(), intervalSec * 1000);
    };
    const stop = () => {
      if (id) { clearInterval(id); id = null; }
    };
    const onVis = () => {
      if (document.visibilityState === "visible") {
        router.refresh(); // świeżutkie dane po powrocie
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stop();
    };
  }, [router, intervalSec]);
  return null;
}
