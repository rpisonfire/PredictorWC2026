"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

const MESSAGES: Record<string, { text: string; tone: "success" | "info" | "warn" }> = {
  saved:           { text: "Typ zapisany",           tone: "success" },
  commented:       { text: "Komentarz dodany",       tone: "success" },
  championSaved:   { text: "Typ na mistrza zapisany", tone: "success" },
  leagueCreated:   { text: "Liga utworzona",          tone: "success" },
  leagueJoined:    { text: "Dołączono do ligi",       tone: "success" },
  leagueLeft:      { text: "Opuściłeś ligę",          tone: "info" },
  passwordChanged: { text: "Hasło zmienione",         tone: "success" },
  avatarSaved:     { text: "Awatar zaktualizowany",   tone: "success" },
  resultSaved:     { text: "Wynik dla meczu zapisany - punkty zostały rozdane", tone: "success" },
  pushSent:        { text: "Powiadomienie wysłane",   tone: "success" },
  resetDone:       { text: "Hasło zresetowane",       tone: "success" },
};

export function Toast({ message, tone = "success" }: { message: string; tone?: "success" | "info" | "warn" }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 3500);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;

  const colors = {
    success: "bg-wc-green/90 shadow-wc-green/30",
    info:    "bg-wc-blue/90 shadow-wc-blue/30",
    warn:    "bg-wc-gold/90 shadow-wc-gold/30",
  }[tone];
  const icon = { success: "✅", info: "ℹ️", warn: "⚠️" }[tone];

  return (
    <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 chip text-white shadow-lg ${colors} px-4 py-2 text-sm animate-in fade-in slide-in-from-top-2`}>
      {icon} {message}
    </div>
  );
}

/**
 * Globalny "auto-toast" - czyta ?toast=key z URL i pokazuje toast,
 * potem usuwa parametr żeby F5 nie pokazał ponownie.
 */
export function AutoToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const key = searchParams.get("toast");
  const cfg = key ? MESSAGES[key] : null;

  useEffect(() => {
    if (!cfg) return;
    // Usuń parametr toast z URL bez przeładowania
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("toast");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 100);
    return () => clearTimeout(t);
  }, [cfg, pathname, router, searchParams]);

  if (!cfg) return null;
  return <Toast message={cfg.text} tone={cfg.tone} />;
}
