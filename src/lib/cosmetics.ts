// Cosmetics — earned, equippable identity items (no pay-to-win, pure flex).
// Unlocks are derived from level + earned achievements (deterministic); the
// user's equipped choice is the only thing that persists (profiles.cosmetics).
// Pure module — safe to import anywhere.

import { ACHIEVEMENTS_BY_ID } from "./achievements";

export type Cosmetics = { title?: string | null; accent?: string | null; frame?: string | null };

// --- accents (personal colour, drawn from the rank-ladder palette) ---------
export type Accent = { id: string; label: string; color: string; minLevel: number };

export const ACCENTS: Accent[] = [
  { id: "ember", label: "Ember", color: "var(--color-ember)", minLevel: 1 },
  { id: "pine", label: "Pine", color: "#7c9473", minLevel: 10 },
  { id: "slate", label: "Slate", color: "#5f8aa8", minLevel: 20 },
  { id: "gold", label: "Gold", color: "#c9a23f", minLevel: 35 },
  { id: "orchid", label: "Orchid", color: "#9a6a8a", minLevel: 50 },
  { id: "crimson", label: "Crimson", color: "#bc572f", minLevel: 70 },
  { id: "dawn", label: "Dawn", color: "#d4825a", minLevel: 90 },
];
const ACCENT_BY_ID = new Map(ACCENTS.map((a) => [a.id, a]));
export const DEFAULT_ACCENT = ACCENTS[0];

// --- frames (a ring around your avatar) ------------------------------------
export type Frame = { id: string; label: string; color: string; minLevel: number };

export const FRAMES: Frame[] = [
  { id: "none", label: "None", color: "", minLevel: 1 },
  { id: "bronze", label: "Bronze", color: "#b07a46", minLevel: 5 },
  { id: "silver", label: "Silver", color: "#9aa3ad", minLevel: 15 },
  { id: "gold", label: "Gold", color: "#c9a23f", minLevel: 30 },
  { id: "amethyst", label: "Amethyst", color: "#9a6a8a", minLevel: 50 },
  { id: "summit", label: "Summit", color: "#bc572f", minLevel: 70 },
];
const FRAME_BY_ID = new Map(FRAMES.map((f) => [f.id, f]));
export const DEFAULT_FRAME = FRAMES[0];

export function frameUnlocked(f: Frame, level: number): boolean {
  return level >= f.minLevel;
}
export const frameHint = (f: Frame) => `Reach level ${f.minLevel}`;

/** Display-only colour lookup (equip-time already validated the unlock). */
export function frameColorOf(id: string | null | undefined): string | null {
  if (!id || id === "none") return null;
  return FRAME_BY_ID.get(id)?.color || null;
}
/** Display-only title label / accent colour lookups (for other users). */
export function titleLabelOf(id: string | null | undefined): string | null {
  return id ? (TITLE_BY_ID.get(id)?.label ?? null) : null;
}
export function accentColorOf(id: string | null | undefined): string | null {
  return id ? (ACCENT_BY_ID.get(id)?.color ?? null) : null;
}

// --- titles (flair text under your name) -----------------------------------
export type Title = { id: string; label: string; achievement?: string; minLevel?: number };

export const TITLES: Title[] = [
  { id: "newcomer", label: "the Newcomer", minLevel: 1 },
  { id: "regular", label: "the Regular", achievement: "workout_25" },
  { id: "centurion", label: "the Centurion", achievement: "workout_100" },
  { id: "unbroken", label: "the Unbroken", achievement: "streak_30" },
  { id: "relentless", label: "the Relentless", achievement: "streak_100" },
  { id: "macro", label: "the Macro-Minded", achievement: "meal_30" },
  { id: "sharpshooter", label: "the Sharpshooter", achievement: "gaming_wr" },
  { id: "veteran", label: "the Veteran", achievement: "gaming_1000" },
  { id: "chronicler", label: "the Chronicler", achievement: "journal_100" },
  { id: "unstoppable", label: "the Unstoppable", achievement: "goal_done_25" },
  { id: "summiteer", label: "the Summiteer", minLevel: 70 },
  { id: "peakseeker", label: "Peak-Seeker", achievement: "rank_peak" },
];
const TITLE_BY_ID = new Map(TITLES.map((t) => [t.id, t]));

// --- unlock predicates ------------------------------------------------------
export function titleUnlocked(t: Title, level: number, earned: Set<string>): boolean {
  if (t.achievement) return earned.has(t.achievement);
  if (t.minLevel) return level >= t.minLevel;
  return true;
}
export function accentUnlocked(a: Accent, level: number): boolean {
  return level >= a.minLevel;
}

/** A short "how to unlock" line for a locked item. */
export function titleHint(t: Title): string {
  if (t.achievement) {
    const a = ACHIEVEMENTS_BY_ID.get(t.achievement);
    return a ? a.description : "Locked";
  }
  return t.minLevel ? `Reach level ${t.minLevel}` : "Locked";
}
export const accentHint = (a: Accent) => `Reach level ${a.minLevel}`;

// --- resolve the equipped (validated) cosmetics ----------------------------
export type ResolvedCosmetics = {
  accentId: string;
  accentColor: string;
  title: { id: string; label: string } | null;
  frameId: string;
  frameColor: string | null;
};

/** Validate saved choices against current unlocks; fall back to defaults. */
export function resolveCosmetics(
  saved: Cosmetics | null | undefined,
  level: number,
  earned: Set<string>,
): ResolvedCosmetics {
  const savedAccent = saved?.accent ? ACCENT_BY_ID.get(saved.accent) : undefined;
  const accent = savedAccent && accentUnlocked(savedAccent, level) ? savedAccent : DEFAULT_ACCENT;

  const savedTitle = saved?.title ? TITLE_BY_ID.get(saved.title) : undefined;
  const title = savedTitle && titleUnlocked(savedTitle, level, earned) ? savedTitle : null;

  const savedFrame = saved?.frame ? FRAME_BY_ID.get(saved.frame) : undefined;
  const frame = savedFrame && frameUnlocked(savedFrame, level) ? savedFrame : DEFAULT_FRAME;

  return {
    accentId: accent.id,
    accentColor: accent.color,
    title: title ? { id: title.id, label: title.label } : null,
    frameId: frame.id,
    frameColor: frame.id === "none" ? null : frame.color,
  };
}

/** Server-side guard: is this equip request actually unlocked? */
export function canEquip(c: Cosmetics, level: number, earned: Set<string>): boolean {
  if (c.accent) {
    const a = ACCENT_BY_ID.get(c.accent);
    if (!a || !accentUnlocked(a, level)) return false;
  }
  if (c.title) {
    const t = TITLE_BY_ID.get(c.title);
    if (!t || !titleUnlocked(t, level, earned)) return false;
  }
  if (c.frame) {
    const f = FRAME_BY_ID.get(c.frame);
    if (!f || !frameUnlocked(f, level)) return false;
  }
  return true;
}
