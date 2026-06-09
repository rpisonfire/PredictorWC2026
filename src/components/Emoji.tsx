"use client";
import { useState } from "react";

// Konwertuje emoji na codepoint hex string używany przez Twemoji.
// "⚽" -> "26bd", "🏆" -> "1f3c6", "🇵🇱" -> "1f1f5-1f1f1"
function emojiToCodepoint(emoji: string): string | null {
  if (!emoji) return null;
  const cps = [...emoji]
    .map((c) => c.codePointAt(0))
    .filter((c): c is number => typeof c === "number" && c !== 0xFE0F); // pomiń variation selector
  if (cps.length === 0) return null;
  return cps.map((c) => c.toString(16)).join("-");
}

type Size = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
const SIZES: Record<Size, number> = { xs: 14, sm: 18, md: 24, lg: 32, xl: 44, "2xl": 64 };

/**
 * Renderuje pojedyncze emoji jako obraz Twemoji (działa na Windowsie).
 * Fallback do natywnego emoji jeśli obrazek się nie załaduje.
 */
export function Emoji({
  char,
  size = "md",
  className = "",
  alt = "",
}: { char: string; size?: Size; className?: string; alt?: string }) {
  const cp = emojiToCodepoint(char);
  const [errored, setErrored] = useState(false);

  if (!cp || errored) {
    return <span className={`leading-none ${className}`}>{char}</span>;
  }

  const px = SIZES[size];
  return (
    <img
      src={`https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${cp}.svg`}
      alt={alt}
      width={px}
      height={px}
      onError={() => setErrored(true)}
      className={`inline-block shrink-0 align-middle ${className}`}
      style={{ width: px, height: px }}
      loading="lazy"
    />
  );
}
