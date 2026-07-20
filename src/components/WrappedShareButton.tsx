"use client";
import { useState } from "react";
import { domToPng } from "modern-screenshot";
import html2canvas from "html2canvas";

/**
 * Eksport Wrapped do PNG.
 * Primary: modern-screenshot (SVG foreignObject) - przeglądarka renderuje CSS
 * natywnie, więc działają background-clip:text (gradientowy tytuł), flagi
 * z FlagCDN i emoji. Obrazy są inlinowane przed zrzutem (brak "wyścigu" z siecią).
 * Fallback: html2canvas, gdyby foreignObject zawiódł (starsze przeglądarki).
 */
export function WrappedShareButton({ nickname }: { nickname: string }) {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    const el = document.getElementById("wrapped-card");
    if (!el) return;
    setBusy(true);
    try {
      // Poczekaj aż wszystkie obrazki w karcie będą zdekodowane
      const imgs = Array.from(el.querySelectorAll("img"));
      await Promise.allSettled(imgs.map((img) => (img.decode ? img.decode() : Promise.resolve())));

      let dataUrl: string;
      try {
        dataUrl = await domToPng(el, {
          backgroundColor: "#0B0F19",
          scale: 2,
          quality: 1,
          fetch: { requestInit: { mode: "cors" } },
        });
      } catch {
        // Fallback - html2canvas
        const canvas = await html2canvas(el, {
          backgroundColor: "#0B0F19",
          scale: 2,
          useCORS: true,
          logging: false,
        });
        dataUrl = canvas.toDataURL("image/png");
      }

      const a = document.createElement("a");
      a.download = `wrapped-2026-${nickname.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.png`;
      a.href = dataUrl;
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
