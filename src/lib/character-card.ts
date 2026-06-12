// Shareable Character Card — a self-contained 1080×1080 SVG poster of a user's
// character. Pure string output with LITERAL colors and generic font stacks (no
// CSS vars, no web fonts) so it rasterizes to PNG cleanly on a canvas. Used for
// the on-page preview and the download.

export type CardAttr = { abbr: string; label: string; score: number | null; color: string };

export type CardData = {
  name: string;
  username: string | null;
  className: string;
  tagline: string;
  level: number;
  rankName: string;
  rankColor: string;
  power: number | null;
  title: string | null;
  attributes: CardAttr[]; // 5, in STR/VIT/FOCUS/MIND/DISC order
};

const BG = "#0e0b14";
const PANEL = "#17131f";
const LINE = "#2a2533";
const INK = "#ece6f2";
const MUTED = "#9a93a8";
const FAINT = "#6b6478";
const ACCENT = "#a78bfa"; // violet — matches the app's ember-rendered-purple
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Helvetica, Arial, sans-serif";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Pentagon vertex for index i (0=top), fraction of radius.
function vertex(cx: number, cy: number, r: number, i: number, frac: number): [number, number] {
  const a = ((-90 + i * 72) * Math.PI) / 180;
  return [cx + Math.cos(a) * r * frac, cy + Math.sin(a) * r * frac];
}
const poly = (pts: [number, number][]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

export function cardSvg(d: CardData): string {
  const cx = 540;
  const cy = 706;
  const R = 188;
  const ring = (frac: number) => poly(d.attributes.map((_, i) => vertex(cx, cy, R, i, frac)));
  const dataPts = d.attributes.map((a, i) => vertex(cx, cy, R, i, (a.score ?? 0) / 100));
  const hasData = d.attributes.some((a) => a.score !== null);

  const vertices = hasData
    ? d.attributes
        .map((a, i) => {
          const [x, y] = vertex(cx, cy, R, i, (a.score ?? 0) / 100);
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="${a.color}"/>`;
        })
        .join("")
    : "";

  const labels = d.attributes
    .map((a, i) => {
      const [x, y] = vertex(cx, cy, R + 40, i, 1);
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="${SANS}" font-size="26" font-weight="700" letter-spacing="1" fill="${a.color}">${a.abbr}</text>
      <text x="${x.toFixed(1)}" y="${(y + 30).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="${SERIF}" font-size="30" fill="${INK}">${a.score ?? "—"}</text>`;
    })
    .join("");

  const powerBlock =
    d.power !== null
      ? `<text x="1016" y="238" text-anchor="end" font-family="${SERIF}" font-size="92" fill="${INK}">${d.power}</text>
         <text x="1016" y="280" text-anchor="end" font-family="${SANS}" font-size="22" font-weight="700" letter-spacing="3" fill="${FAINT}">/ 100 POWER</text>`
      : "";

  const titleLine = d.title
    ? `<text x="64" y="416" font-family="${SERIF}" font-size="34" fill="${ACCENT}">${esc(d.title)}</text>`
    : "";

  return `<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="50%" cy="34%" r="60%">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1080" height="1080" fill="${BG}"/>
  <rect x="20" y="20" width="1040" height="1040" rx="40" fill="${PANEL}" stroke="${LINE}" stroke-width="2"/>
  <rect x="20" y="20" width="1040" height="1040" rx="40" fill="url(#glow)"/>

  <!-- header -->
  <text x="64" y="96" font-family="${SANS}" font-size="30" font-weight="800" letter-spacing="6" fill="${ACCENT}">UPWARD</text>
  ${d.username ? `<text x="1016" y="96" text-anchor="end" font-family="${SANS}" font-size="28" fill="${MUTED}">@${esc(d.username)}</text>` : ""}

  <!-- class crest -->
  <g transform="translate(64,150)">
    <circle cx="60" cy="60" r="60" fill="${d.rankColor}1f" stroke="${d.rankColor}66" stroke-width="2"/>
    <path d="M24 92 L52 36 L70 64 L84 44 L96 92 Z" fill="${d.rankColor}22" stroke="${d.rankColor}" stroke-width="3" stroke-linejoin="round"/>
  </g>

  <!-- class + rank -->
  <text x="208" y="220" font-family="${SERIF}" font-size="82" fill="${INK}">${esc(d.className)}</text>
  <text x="208" y="276" font-family="${SANS}" font-size="28" fill="${MUTED}">${esc(d.tagline)}</text>
  ${powerBlock}

  <!-- rank chip + level -->
  ${(() => {
    const chipW = 40 + d.rankName.length * 15.5;
    return `<rect x="64" y="338" width="${chipW.toFixed(0)}" height="46" rx="23" fill="${d.rankColor}1f"/>
    <text x="${(64 + chipW / 2).toFixed(0)}" y="369" text-anchor="middle" font-family="${SANS}" font-size="22" font-weight="700" letter-spacing="2" fill="${d.rankColor}">${esc(d.rankName.toUpperCase())}</text>
    <text x="${(64 + chipW + 22).toFixed(0)}" y="369" font-family="${SANS}" font-size="24" font-weight="700" letter-spacing="2" fill="${FAINT}">LEVEL ${d.level}</text>`;
  })()}
  ${titleLine}

  <!-- radar -->
  ${[0.25, 0.5, 0.75, 1].map((f) => `<polygon points="${ring(f)}" fill="none" stroke="${LINE}" stroke-width="1.5"/>`).join("")}
  ${d.attributes.map((_, i) => { const [x, y] = vertex(cx, cy, R, i, 1); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${LINE}" stroke-width="1.5"/>`; }).join("")}
  ${hasData ? `<polygon points="${poly(dataPts)}" fill="${ACCENT}" fill-opacity="0.22" stroke="${ACCENT}" stroke-width="3" stroke-linejoin="round"/>` : ""}
  ${vertices}
  ${labels}

  <!-- footer -->
  <line x1="64" y1="985" x2="1016" y2="985" stroke="${LINE}" stroke-width="2"/>
  <text x="64" y="1028" font-family="${SANS}" font-size="26" font-weight="700" letter-spacing="3" fill="${MUTED}">CLIMB IN REAL LIFE</text>
  <text x="1016" y="1028" text-anchor="end" font-family="${SERIF}" font-size="28" fill="${ACCENT}">Start your ascent ↗</text>
</svg>`;
}
