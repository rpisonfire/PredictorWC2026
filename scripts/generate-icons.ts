import sharp from "sharp";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const OUT = join(process.cwd(), "public", "icons");
mkdirSync(OUT, { recursive: true });

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B0F19"/>
      <stop offset="100%" stop-color="#0A3161"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <!-- Stylizowana piłka -->
  <circle cx="256" cy="232" r="120" fill="#F5F7FA"/>
  <!-- Czarne pięciokąty piłki -->
  <polygon points="256,160 296,189 281,236 231,236 216,189" fill="#0B0F19"/>
  <polygon points="186,222 226,252 211,298 161,298 146,252" fill="#0B0F19" transform="translate(-5,5)" opacity="0.9"/>
  <polygon points="290,225 330,255 315,302 265,302 250,255" fill="#0B0F19" transform="translate(5,2)" opacity="0.9"/>
  <!-- "2026" -->
  <text x="256" y="445" font-size="78" font-weight="900" text-anchor="middle" fill="#A6E22E" font-family="Helvetica, Arial, sans-serif" letter-spacing="3">2026</text>
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
  writeFileSync(join(OUT, "icon.svg"), SVG);
  console.log("✓ icon.svg (master)");
}

main().catch(console.error);
