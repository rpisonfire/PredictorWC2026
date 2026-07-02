"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { playSwoosh } from "@/lib/sound";

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
  userDeleted:     { text: "Konto usunięte",           tone: "info" },
};

export function Toast({ message, tone = "success" }: { message: string; tone?: "success" | "info" | "warn" }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 3500);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;

  // LED stadium panel - kolor diod zależny od tonu
  const ledColor = {
    success: "#A6E22E",
    info:    "#4FC3F7",
    warn:    "#F1B434",
  }[tone];
  const icon = { success: "✔", info: "ℹ", warn: "⚠" }[tone];

  return (
    <div
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-2.5 text-sm font-black uppercase tracking-wider ${tone === "success" ? "led-flash" : ""}`}
      style={{
        background: "linear-gradient(180deg, #0a0e1a 0%, #050810 100%)",
        border: `1px solid ${ledColor}66`,
        color: ledColor,
        fontFamily: "'Courier New', monospace",
        textShadow: `0 0 8px ${ledColor}80`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 16px ${ledColor}33`,
      }}
    >
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
    // Zagraj swoosh dla akcji zapisu (jeśli włączony w profilu)
    if (cfg.tone === "success") playSwoosh();
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
