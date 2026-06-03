// Generates the PWA / app icons from the Upward arrow mark.
// Run with: node scripts/make-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EMBER = "#bc572f";
const PUBLIC = fileURLToPath(new URL("../public/", import.meta.url));
mkdirSync(PUBLIC, { recursive: true });

/**
 * Full-bleed ember square with a centered white upward arrow.
 * `pad` (0–1) controls how much breathing room around the mark (bigger = more
 * padding, for maskable safe-zone).
 */
function svg(size, pad) {
  const c = size / 2;
  const half = (size / 2) * (1 - pad); // mark half-extent
  const top = c - half;
  const bottom = c + half;
  const w = half * 0.92; // chevron half-width
  const apex = top;
  const sw = size * 0.085; // stroke width
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${EMBER}"/>
  <g fill="none" stroke="#ffffff" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M${c} ${bottom} V${apex + half * 0.18}"/>
    <path d="M${c - w} ${apex + w} L${c} ${apex} L${c + w} ${apex + w}"/>
  </g>
</svg>`;
}

async function png(name, size, pad) {
  await sharp(Buffer.from(svg(size, pad)))
    .png()
    .toFile(`${PUBLIC}/${name}`);
  console.log("→", name);
}

await png("icon-192.png", 192, 0.28);
await png("icon-512.png", 512, 0.28);
await png("icon-maskable-512.png", 512, 0.4);
await png("apple-touch-icon.png", 180, 0.24);
console.log("done");
