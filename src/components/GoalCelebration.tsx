"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Fullscreen "GOOOOL!" overlay - pojawia się gdy admin zapisze wynik
 * (toast=resultSaved) lub user trafi dokładny wynik (toast=saved? no - tylko admin).
 * Auto-zniknięcie po 1.8s przez CSS animation.
 */
export function GoalCelebration() {
  const params = useSearchParams();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (params.get("toast") === "resultSaved") {
      setShow(true);
      const t = setTimeout(() => setShow(false), 1800);
      return () => clearTimeout(t);
    }
  }, [params]);

  if (!show) return null;
  return (
    <div className="goal-celebration" aria-hidden="true">
      <span>GOOOOL!</span>
    </div>
  );
}
