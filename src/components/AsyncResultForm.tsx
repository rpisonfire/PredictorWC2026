"use client";
import { useState, useTransition, type CSSProperties, type ReactNode } from "react";
import { playSwoosh } from "@/lib/sound";
import { GoalCelebration } from "./GoalCelebration";

type ActionResult = { ok: boolean } | void;

/**
 * Asynchroniczny wrapper formularza dla panelu admina.
 * Server action wykonuje się w tle (useTransition) - BEZ redirectu i reloadu strony.
 * Feedback: LED flash na kaflu + lokalny toast + swoosh. Admin może zapisywać
 * kolejne mecze bez utraty wpisanych wartości w pozostałych formularzach.
 */
export function AsyncResultForm({
  action,
  className,
  style,
  children,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [flash, setFlash] = useState(false);
  const [goalTrigger, setGoalTrigger] = useState(0);

  const handleAction = (formData: FormData) => {
    startTransition(async () => {
      try {
        const res = await action(formData);
        if (res && res.ok === false) throw new Error("save_failed");
        setStatus("saved");
        setFlash(true);
        setGoalTrigger((n) => n + 1); // GOOOOL! overlay
        playSwoosh();
        setTimeout(() => setFlash(false), 950);
        setTimeout(() => setStatus("idle"), 3000);
      } catch {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3500);
      }
    });
  };

  return (
    <form action={handleAction} className={`${className ?? ""} ${flash ? "led-flash" : ""}`} style={style}>
      {/* fieldset disabled blokuje wszystkie pola + submit na czas zapisu */}
      <fieldset disabled={pending} className="contents" style={{ opacity: pending ? 0.6 : 1, transition: "opacity 0.15s" }}>
        {children}
      </fieldset>
      <GoalCelebration trigger={goalTrigger} />
      {status !== "idle" && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-2.5 text-sm font-black uppercase tracking-wider"
          style={{
            background: "linear-gradient(180deg, #0a0e1a 0%, #050810 100%)",
            border: `1px solid ${status === "saved" ? "rgba(166,226,46,0.4)" : "rgba(228,0,43,0.5)"}`,
            color: status === "saved" ? "#A6E22E" : "#FF5964",
            fontFamily: "'Courier New', monospace",
            textShadow: `0 0 8px ${status === "saved" ? "rgba(166,226,46,0.5)" : "rgba(228,0,43,0.5)"}`,
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          }}
        >
          {status === "saved" ? "✔ Wynik zapisany · punkty przeliczone" : "⚠ Błąd zapisu - spróbuj ponownie"}
        </div>
      )}
    </form>
  );
}
