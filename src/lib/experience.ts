// Experience mode — the user picks how Upward feels: a full RPG ("gamified")
// or a calm, minimal tracker ("classic"). Both keep levels/XP and streaks; the
// classic mode drops the game framing (class, Power, attributes, quests,
// seasons), wears a softer palette, and quiets the atmosphere. PURE module —
// safe to import anywhere (the server reader lives in experience-data.ts).

export type Experience = "gamified" | "classic";

export const DEFAULT_EXPERIENCE: Experience = "gamified";

export type ExperienceMeta = {
  id: Experience;
  name: string;
  tagline: string;
  blurb: string;
  bullets: string[];
};

export const EXPERIENCES: ExperienceMeta[] = [
  {
    id: "gamified",
    name: "Gamified",
    tagline: "Your life, as an RPG",
    blurb:
      "Everything you track becomes a character that levels up — five attributes, a class, daily quests, seasons, and a mountain to climb.",
    bullets: ["Character sheet & class", "Daily quests & seasons", "Levels, XP & achievements"],
  },
  {
    id: "classic",
    name: "Classic",
    tagline: "Calm, clean tracking",
    blurb:
      "A quiet, focused tracker that's easy on the eyes. The same powerful logging and insights, minus the game — and you still earn levels as you go.",
    bullets: ["Minimal & distraction-free", "A softer, calmer palette", "Levels & streaks, kept simple"],
  },
];

export function isExperience(v: unknown): v is Experience {
  return v === "gamified" || v === "classic";
}

export function asExperience(v: unknown): Experience {
  return isExperience(v) ? v : DEFAULT_EXPERIENCE;
}
