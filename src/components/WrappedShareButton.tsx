"use client";
import { useState } from "react";
import html2canvas from "html2canvas";

/**
 * Eksport Wrapped do PNG - renderuje #wrapped-card do canvas (scale 2 = retina)
 * i pobiera jako plik. Działa w pełni client-side.
 */
export function WrappedShareButton({ nickname }: { nickname: string }) {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    const el = document.getElementById("wrapped-card");
    if (!el) return;
    setBusy(true);
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: "#0B0F19",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const a = document.createElement("a");
      a.download = `wrapped-2026-${nickname.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={download}
      disabled={busy}
      className="btn w-full font-black text-base"
      style={{
        background: "linear-gradient(135deg, #AA151B, #F1BF00, #AA151B)",
        color: "#0B0F19",
        boxShadow: "0 0 22px rgba(241,191,0,0.35)",
        opacity: busy ? 0.7 : 1,
      }}
    >
      {busy ? "⏳ Generuję obraz..." : "📸 Pobierz Wrapped jako PNG"}
    </button>
  );
}
