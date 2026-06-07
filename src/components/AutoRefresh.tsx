"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Odświeża route co `intervalSec` sekund — używać gdy są mecze live. */
export function AutoRefresh({ intervalSec = 60 }: { intervalSec?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalSec * 1000);
    return () => clearInterval(id);
  }, [router, intervalSec]);
  return null;
}
