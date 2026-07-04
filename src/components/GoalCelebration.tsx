"use client";
import { useEffect, useState } from "react";

/**
 * Fullscreen "GOOOOL!" overlay - odpalany imperatywnie (prop trigger),
 * przez AsyncResultForm po udanym zapisie wyniku w adminie.
 * Każda zmiana trigger > 0 pokazuje overlay; auto-zniknięcie po 1.8s.
 */
export function GoalCelebration({ trigger }: { trigger: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 1800);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!show) return null;
  return (
    <div className="goal-celebration" aria-hidden="true">
      <span>GOOOOL!</span>
    </div>
  );
}
