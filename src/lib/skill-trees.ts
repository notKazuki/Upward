// Skill trees — a pure re-view of the existing achievement catalog as one
// progression "Path" per attribute. No new data: each attribute's Path is its
// categories' badges, ordered easy → hard, marked unlocked from the user's
// earned set. Extends achievements.ts; doesn't replace it.

import {
  ACHIEVEMENTS,
  achievementProgress,
  TIERS,
  type Achievement,
  type AchievementCategory,
  type AchievementStats,
  type Tier,
} from "./achievements";
import { ATTR_ACCENT, type AttrId } from "./character";

// Which achievement categories feed each attribute Path.
const ATTR_CATEGORIES: Record<AttrId, AchievementCategory[]> = {
  str: ["Training"],
  vit: ["Nutrition", "Supplements"],
  focus: ["Gaming"],
  mind: ["Mind"],
  discipline: ["Goals"],
};

const ATTR_LABEL: Record<AttrId, string> = {
  str: "Strength",
  vit: "Vitality",
  focus: "Focus",
  mind: "Mind",
  discipline: "Discipline",
};

const ORDER: AttrId[] = ["str", "vit", "focus", "mind", "discipline"];
const TIER_RANK: Record<Tier, number> = { bronze: 0, silver: 1, gold: 2, platinum: 3 };

export type SkillNode = {
  id: string;
  label: string;
  description: string;
  tier: Tier;
  color: string; // tier color
  unlocked: boolean;
  progress: { current: number; target: number; pct: number } | null;
};

export type SkillPath = {
  attr: AttrId;
  label: string;
  color: string;
  nodes: SkillNode[];
  unlocked: number;
  total: number;
  // The next locked, progress-trackable node — the Sherpa's "closest win".
  next: SkillNode | null;
};

// Easy → hard within a Path: by tier, then by numeric target.
function difficulty(a: Achievement): number {
  return TIER_RANK[a.tier] * 100000 + (a.target ?? 50000);
}

export function buildSkillTrees(stats: AchievementStats, earned: Set<string>): SkillPath[] {
  return ORDER.map((attr) => {
    const cats = ATTR_CATEGORIES[attr];
    const items = ACHIEVEMENTS.filter((a) => cats.includes(a.category)).sort(
      (a, b) => difficulty(a) - difficulty(b),
    );

    const nodes: SkillNode[] = items.map((a) => ({
      id: a.id,
      label: a.label,
      description: a.description,
      tier: a.tier,
      color: TIERS[a.tier].color,
      unlocked: earned.has(a.id),
      progress: earned.has(a.id) ? null : achievementProgress(a, stats),
    }));

    const unlocked = nodes.filter((n) => n.unlocked).length;
    // Closest win: highest-progress locked node that has a progress bar.
    const next =
      nodes
        .filter((n) => !n.unlocked && n.progress !== null)
        .sort((a, b) => (b.progress?.pct ?? 0) - (a.progress?.pct ?? 0))[0] ?? null;

    return {
      attr,
      label: ATTR_LABEL[attr],
      color: ATTR_ACCENT[attr],
      nodes,
      unlocked,
      total: nodes.length,
      next,
    };
  });
}
