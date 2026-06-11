// The RPG character layer — a pure, deterministic mapping from the report-card
// domain scores (report.ts) onto five attributes, a derived class, and tiers
// that feed the skill trees (skill-trees.ts). No new scoring, no data fetching:
// give it a Report (+ a consistency signal) and it returns the character sheet.

import type { Report } from "./report";

export type AttrId = "str" | "vit" | "focus" | "mind" | "discipline";

// Per-attribute accent colors, drawn from the rank-ladder palette so the whole
// RPG layer (radar, paths, skill trees) shares one on-brand source of truth.
export const ATTR_ACCENT: Record<AttrId, string> = {
  str: "#bc572f",
  vit: "#7c9473",
  focus: "#5f8aa8",
  mind: "#9a6a8a",
  discipline: "#c9a23f",
};

export type Attribute = {
  id: AttrId;
  abbr: string; // "STR"
  label: string; // "Strength"
  score: number | null; // 0-100, or null when nothing feeds it yet
  tier: number; // 0-5, derived from score — the skill-tree rung
  blurb: string;
  sources: string[]; // domain labels feeding this attribute
};

export type CharacterClass = {
  id: string;
  name: string; // "Duelist"
  tagline: string;
  attr: AttrId | "balanced" | "none";
};

export type Character = {
  attributes: Attribute[]; // always 5, in fixed order
  power: number | null; // overall — mean of the attributes that have data
  klass: CharacterClass;
  dominant: Attribute | null; // highest-scoring attribute
  // The runner-up the dominant is defending against — powers the Sherpa's
  // "you're N points from evolving into <class>" nudge.
  ascendant: { attr: Attribute; gap: number } | null;
};

// --- attribute definitions -------------------------------------------------
// Each attribute blends one or more report domains. Where two domains feed one
// attribute we average the ones that have data (a null domain doesn't drag it
// down — you're not punished for not tracking something).
const ATTR_META: {
  id: AttrId;
  abbr: string;
  label: string;
  domains: string[]; // report domain ids
  blurb: string;
}[] = [
  { id: "str", abbr: "STR", label: "Strength", domains: ["training"], blurb: "Forged under the bar." },
  { id: "vit", abbr: "VIT", label: "Vitality", domains: ["nutrition", "supplements"], blurb: "Fuel, recovery, the engine." },
  { id: "focus", abbr: "FOCUS", label: "Focus", domains: ["gaming"], blurb: "Sharp when it counts." },
  { id: "mind", abbr: "MIND", label: "Mind", domains: ["mind"], blurb: "Clarity over chaos." },
  { id: "discipline", abbr: "DISC", label: "Discipline", domains: ["goals"], blurb: "You simply show up." },
];

// --- classes (derived, not chosen) -----------------------------------------
export const CLASSES: Record<AttrId | "balanced" | "none", CharacterClass> = {
  str: { id: "titan", name: "Titan", tagline: "Mountains move when you do.", attr: "str" },
  vit: { id: "druid", name: "Druid", tagline: "Steward of the living engine.", attr: "vit" },
  focus: { id: "ranger", name: "Ranger", tagline: "One breath, one shot.", attr: "focus" },
  mind: { id: "oracle", name: "Oracle", tagline: "You see what others miss.", attr: "mind" },
  discipline: { id: "monk", name: "Monk", tagline: "Unmoved, unbroken.", attr: "discipline" },
  balanced: { id: "ascendant", name: "Ascendant", tagline: "Master of every face of the mountain.", attr: "balanced" },
  none: { id: "wanderer", name: "Wanderer", tagline: "Your story hasn't been written yet.", attr: "none" },
};

// --- helpers ---------------------------------------------------------------
const round = (n: number) => Math.round(n);

/** Tier 0-5 from a 0-100 score — the rung each skill-tree path is at. */
export function tierForScore(score: number | null): number {
  if (score === null) return 0;
  if (score >= 85) return 5;
  if (score >= 70) return 4;
  if (score >= 55) return 3;
  if (score >= 40) return 2;
  if (score >= 20) return 1;
  return 0;
}

/** Average of the present (non-null) numbers, or null if none. */
function blend(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  return round(present.reduce((a, b) => a + b, 0) / present.length);
}

/**
 * Build the character sheet from a report. `consistencyPct` (0-100, active days
 * / window) feeds Discipline alongside the goals domain, since showing up *is*
 * discipline — pass it from periodStats if you have it.
 */
export function buildCharacter(report: Report, consistencyPct: number | null = null): Character {
  const byDomain = new Map(report.domains.map((d) => [d.id, d.score]));

  const attributes: Attribute[] = ATTR_META.map((meta) => {
    const parts = meta.domains.map((id) => (byDomain.has(id) ? byDomain.get(id)! : null));
    // Discipline also folds in raw consistency.
    if (meta.id === "discipline") parts.push(consistencyPct);
    const score = blend(parts);
    const sources = meta.domains
      .filter((id) => byDomain.has(id))
      .map((id) => report.domains.find((d) => d.id === id)!.label);
    if (meta.id === "discipline" && consistencyPct !== null) sources.push("Consistency");
    return {
      id: meta.id,
      abbr: meta.abbr,
      label: meta.label,
      score,
      tier: tierForScore(score),
      blurb: meta.blurb,
      sources,
    };
  });

  const scored = attributes.filter((a) => a.score !== null) as (Attribute & { score: number })[];
  const power = scored.length ? round(scored.reduce((a, b) => a + b.score, 0) / scored.length) : null;

  // Class from the dominant attribute. "Balanced" (Mountaineer) when the spread
  // between top and bottom scored attributes is tight and you have a broad base.
  let klass = CLASSES.none;
  let dominant: Attribute | null = null;
  let ascendant: Character["ascendant"] = null;

  if (scored.length > 0) {
    const sorted = [...scored].sort((a, b) => b.score - a.score);
    const top = sorted[0];
    dominant = top;
    const lowest = sorted[sorted.length - 1];
    const spread = top.score - lowest.score;
    const balanced = scored.length >= 4 && spread <= 12 && lowest.score >= 45;
    klass = balanced ? CLASSES.balanced : CLASSES[top.id];

    if (!balanced && sorted.length > 1) {
      const runnerUp = sorted[1];
      ascendant = { attr: runnerUp, gap: top.score - runnerUp.score };
    }
  }

  return { attributes, power, klass, dominant, ascendant };
}
