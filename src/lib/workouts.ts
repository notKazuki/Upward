export type Workout = {
  id: string;
  performed_on: string;
  category: string; // a "day" label: a split day, a general tag, or legacy slug
  title: string;
  duration_min: number | null;
  notes: string | null;
  created_at: string;
};

export type WorkoutSet = {
  id: string;
  workout_id: string;
  exercise: string;
  set_index: number;
  weight: number | null;
  reps: number | null;
  created_at: string;
};

/** Best (heaviest) set per exercise, strongest first. */
export function personalRecords(
  sets: WorkoutSet[],
): { exercise: string; weight: number; reps: number | null }[] {
  const best = new Map<string, { weight: number; reps: number | null }>();
  for (const s of sets) {
    if (s.weight == null) continue;
    const cur = best.get(s.exercise);
    if (!cur || s.weight > cur.weight) best.set(s.exercise, { weight: s.weight, reps: s.reps });
  }
  return [...best.entries()]
    .map(([exercise, v]) => ({ exercise, ...v }))
    .sort((a, b) => b.weight - a.weight);
}

/** Most recent set per exercise (expects `sets` ordered newest-first). */
export function lastByExercise(
  sets: WorkoutSet[],
): Record<string, { weight: number | null; reps: number | null }> {
  const out: Record<string, { weight: number | null; reps: number | null }> = {};
  for (const s of sets) {
    if (!(s.exercise in out)) out[s.exercise] = { weight: s.weight, reps: s.reps };
  }
  return out;
}

/** Preset training splits. Each is an ordered list of day labels. */
export const SPLIT_PRESETS: { id: string; name: string; days: string[] }[] = [
  { id: "full_body", name: "Full Body", days: ["Full Body"] },
  { id: "upper_lower", name: "Upper / Lower", days: ["Upper", "Lower"] },
  { id: "ppl", name: "Push / Pull / Legs", days: ["Push", "Pull", "Legs"] },
  {
    id: "arnold",
    name: "Arnold",
    days: ["Chest & Back", "Shoulders & Arms", "Legs"],
  },
  {
    id: "bro",
    name: "Bro Split",
    days: ["Chest", "Back", "Shoulders", "Arms", "Legs"],
  },
  {
    id: "glute_lower",
    name: "Glute & Lower Focus",
    days: ["Glutes & Hams", "Quads & Calves", "Upper Body"],
  },
];

/** Always available regardless of split, for non-lifting days. */
export const GENERAL_DAYS = ["Cardio", "Mobility", "Rest"];

export function splitDisplayName(id: string | null, name: string | null) {
  if (name) return name;
  return SPLIT_PRESETS.find((s) => s.id === id)?.name ?? "Workout";
}

// Legacy category slugs from the first version of the tracker.
const LEGACY: Record<string, string> = {
  strength: "Strength",
  cardio: "Cardio",
  mobility: "Mobility",
  sport: "Sport",
};
export function displayDay(label: string): string {
  return LEGACY[label] ?? label;
}

const FIXED_COLORS: Record<string, string> = {
  Cardio: "#d4825a",
  Mobility: "#7c9473",
  Rest: "#a89e8f",
  strength: "#bc572f",
  cardio: "#d4825a",
  mobility: "#7c9473",
  sport: "#c9a23f",
};
const PALETTE = ["#bc572f", "#d4825a", "#c9a23f", "#7c9473", "#9a6a8a", "#5f8aa8"];
export function dayColor(label: string): string {
  if (FIXED_COLORS[label]) return FIXED_COLORS[label];
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
