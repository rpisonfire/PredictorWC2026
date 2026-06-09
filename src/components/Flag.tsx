"use client";
import { useState } from "react";

// Specjalne flagi regionalne (brak ISO 3166-1)
const SPECIAL_MAP: Record<string, string> = {
  "🏴󠁧󠁢󠁥󠁮󠁧󠁿": "gb-eng",
  "🏴󠁧󠁢󠁳󠁣󠁴󠁿": "gb-sct",
  "🏴󠁧󠁢󠁷󠁬󠁳󠁿": "gb-wls",
};

// Konwertuje flagę emoji (np. 🇵🇱) na kod ISO 3166-1 alpha-2 (np. "pl")
function emojiToIso(emoji: string): string | null {
  if (!emoji) return null;
  if (SPECIAL_MAP[emoji]) return SPECIAL_MAP[emoji];
  const cps = [...emoji].map((c) => c.codePointAt(0)!);
  if (cps.length < 2) return null;
  const isRI = (c: number) => c >= 0x1F1E6 && c <= 0x1F1FF;
  if (!isRI(cps[0]) || !isRI(cps[1])) return null;
  const a = String.fromCharCode(cps[0] - 0x1F1E6 + 65);
  const b = String.fromCharCode(cps[1] - 0x1F1E6 + 65);
  return (a + b).toLowerCase();
}

type Size = "xs" | "sm" | "md" | "lg" | "xl";
const SIZES: Record<Size, number> = { xs: 14, sm: 18, md: 24, lg: 32, xl: 44 };

export function Flag({
  emoji,
  size = "md",
  className = "",
  alt = "",
}: { emoji: string; size?: Size; className?: string; alt?: string }) {
  const iso = emojiToIso(emoji);
  const [errored, setErrored] = useState(false);

  if (!iso || errored) {
    // Fallback: pokaż emoji (działa na macOS/iOS/Android, fail na Windowsie)
    return <span className={`leading-none ${className}`}>{emoji}</span>;
  }

  const w = SIZES[size];
  const h = Math.round(w * 0.72);
  return (
    <img
      src={`https://flagcdn.com/${iso}.svg`}
      alt={alt}
      width={w}
      height={h}
      onError={() => setErrored(true)}
      className={`inline-block rounded-[3px] shrink-0 ${className}`}
      style={{ objectFit: "cover", aspectRatio: "3 / 2" }}
      loading="lazy"
    />
  );
}
