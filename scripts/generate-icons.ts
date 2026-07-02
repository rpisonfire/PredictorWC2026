import sharp from "sharp";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const OUT = join(process.cwd(), "public", "icons");
mkdirSync(OUT, { recursive: true });

/**
 * Logo WC Predictor 2026: złote trofeum (puchar świata) trzymające piłkę.
 * Geometryczne, wektorowe, czytelne od 16px do 512px.
 * - Tło: ciemny granat LED (spójny z motywem aplikacji)
 * - Trofeum: złoty gradient + subtelny glow
 * - Piłka: jasna, z pentagonem i "szprychami" (klasyczny wzór, uproszczony)
 */

// Wspólna grafika trofeum + piłki (bez tła) - używana w obu wariantach
const ARTWORK = `
    <!-- Subtelny złoty glow za trofeum -->
    <circle cx="256" cy="240" r="200" fill="url(#glow)"/>

    <!-- Uchwyty pucharu -->
    <path d="M166 218 C 112 214, 108 286, 178 296" stroke="url(#gold)" stroke-width="20" stroke-linecap="round" fill="none"/>
    <path d="M346 218 C 400 214, 404 286, 334 296" stroke="url(#gold)" stroke-width="20" stroke-linecap="round" fill="none"/>

    <!-- Czasza pucharu (otwarta ku górze, trzyma piłkę) -->
    <path d="M166 210 L346 210 A 90 90 0 0 1 166 210 Z" fill="url(#gold)"/>

    <!-- Nóżka -->
    <path d="M242 298 L270 298 L262 356 L250 356 Z" fill="url(#gold)"/>
    <ellipse cx="256" cy="356" rx="30" ry="10" fill="url(#gold)"/>

    <!-- Podstawa (dwa stopnie) -->
    <rect x="210" y="362" width="92" height="20" rx="7" fill="url(#gold)"/>
    <rect x="188" y="386" width="136" height="30" rx="10" fill="url(#goldDark)"/>

    <!-- Piłka w czaszy -->
    <circle cx="256" cy="168" r="76" fill="#F8FAFC"/>
    <!-- Pentagon centralny -->
    <polygon points="256,138 285,159 274,192 238,192 227,159" fill="#0B0F19"/>
    <!-- Szprychy do krawędzi -->
    <g stroke="#0B0F19" stroke-width="8" stroke-linecap="round">
      <line x1="256" y1="138" x2="256" y2="104"/>
      <line x1="285" y1="159" x2="317" y2="148"/>
      <line x1="274" y1="192" x2="294" y2="219"/>
      <line x1="238" y1="192" x2="218" y2="219"/>
      <line x1="227" y1="159" x2="195" y2="148"/>
    </g>
    <!-- Delikatny cień na piłce (3D) -->
    <path d="M256 92 A 76 76 0 0 1 332 168 A 92 92 0 0 0 256 92 Z" fill="rgba(11,15,25,0.12)"/>
`;

const DEFS = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#101B33"/>
      <stop offset="100%" stop-color="#0B0F19"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFE28C"/>
      <stop offset="55%" stop-color="#F1B434"/>
      <stop offset="100%" stop-color="#B87A0D"/>
    </linearGradient>
    <linearGradient id="goldDark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#D99A1B"/>
      <stop offset="100%" stop-color="#8C5E08"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="rgba(241,180,52,0.28)"/>
      <stop offset="70%" stop-color="rgba(241,180,52,0.08)"/>
      <stop offset="100%" stop-color="rgba(241,180,52,0)"/>
    </radialGradient>
  </defs>
`;

// Wariant standardowy - zaokrąglony kwadrat
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${DEFS}
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  ${ARTWORK}
</svg>`;

// Wariant maskable - full-bleed tło, grafika w safe zone (środkowe 80%)
const SVG_MASKABLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${DEFS}
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(51.2 51.2) scale(0.8)">
    ${ARTWORK}
  </g>
</svg>`;

const SIZES = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "favicon-32.png", size: 32 },
  { name: "favicon-16.png", size: 16 },
];

async function main() {
  for (const { name, size } of SIZES) {
    await sharp(Buffer.from(SVG))
      .resize(size, size)
      .png()
      .toFile(join(OUT, name));
    console.log(`✓ ${name} (${size}x${size})`);
  }
  // Maskable PNG (Android adaptive icons)
  await sharp(Buffer.from(SVG_MASKABLE))
    .resize(512, 512)
    .png()
    .toFile(join(OUT, "icon-maskable-512.png"));
  console.log("✓ icon-maskable-512.png (512x512)");

  writeFileSync(join(OUT, "icon.svg"), SVG);
  writeFileSync(join(OUT, "icon-maskable.svg"), SVG_MASKABLE);
  console.log("✓ icon.svg + icon-maskable.svg (masters)");
}

main().catch(console.error);
