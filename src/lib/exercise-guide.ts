// Curated exercise + rep/set guidance, keyed by split-day label. This is static
// reference content (no DB) that powers the "Day guide" on the workout page so a
// beginner picking a split knows what to actually do and how many sets/reps.

export type Exercise = {
  name: string;
  target: string; // primary muscle(s)
  sets: string; // e.g. "3–4"
  reps: string; // e.g. "8–12"
};

export type TrainingGoal = "strength" | "hypertrophy" | "endurance";

/** How rep ranges map to a training goal — the legend, and the selectable goal. */
export const REP_GUIDANCE: {
  id: TrainingGoal;
  goal: string;
  repRange: string;
  reps: string;
  rest: string;
  note: string;
}[] = [
  {
    id: "strength",
    goal: "Strength",
    repRange: "3–5",
    reps: "3–5 reps",
    rest: "2–3 min rest",
    note: "Heavy weight, low reps. Builds raw strength and power.",
  },
  {
    id: "hypertrophy",
    goal: "Muscle / size",
    repRange: "8–12",
    reps: "8–12 reps",
    rest: "60–90s rest",
    note: "Moderate weight taken close to failure. The classic size range.",
  },
  {
    id: "endurance",
    goal: "Tone / endurance",
    repRange: "15–20",
    reps: "15–20 reps",
    rest: "30–45s rest",
    note: "Lighter weight, high reps. Builds definition and stamina.",
  },
];

/** Rep range for a goal, used to retune the guide when a goal is selected. */
export function repsForGoal(goal: TrainingGoal | null): string | null {
  return REP_GUIDANCE.find((g) => g.id === goal)?.repRange ?? null;
}

export type CustomExercise = {
  id: string;
  day_label: string;
  name: string;
  target: string | null;
  sets: string | null;
  reps: string | null;
};

export const PROGRESSION_NOTE =
  "Progressive overload is the whole game: each week aim to add a little weight, one more rep, or one more set. If you hit the top of a rep range with good form, go heavier next time.";

const G = (name: string, target: string, sets: string, reps: string): Exercise => ({
  name,
  target,
  sets,
  reps,
});

/**
 * Exercises per day label. Covers every label used by the split presets plus the
 * goal-focused days. Anything not listed falls back to a sensible default.
 */
export const EXERCISE_GUIDE: Record<string, Exercise[]> = {
  "Full Body": [
    G("Barbell Back Squat", "Quads, glutes", "3", "6–10"),
    G("Bench Press", "Chest, triceps", "3", "6–10"),
    G("Bent-Over Row", "Back, biceps", "3", "8–10"),
    G("Overhead Press", "Shoulders", "3", "8–10"),
    G("Romanian Deadlift", "Hamstrings, glutes", "3", "8–12"),
    G("Plank", "Core", "3", "30–60s"),
  ],
  Upper: [
    G("Bench Press", "Chest, triceps", "3–4", "6–10"),
    G("Pull-Up / Lat Pulldown", "Back, biceps", "3–4", "8–12"),
    G("Overhead Press", "Shoulders", "3", "8–10"),
    G("Seated Cable Row", "Back", "3", "10–12"),
    G("Lateral Raise", "Side delts", "3", "12–15"),
    G("Biceps Curl + Triceps Pushdown", "Arms", "3", "10–12"),
  ],
  Lower: [
    G("Barbell Back Squat", "Quads, glutes", "3–4", "6–10"),
    G("Romanian Deadlift", "Hamstrings, glutes", "3", "8–12"),
    G("Leg Press", "Quads", "3", "10–12"),
    G("Walking Lunge", "Quads, glutes", "3", "10–12 / leg"),
    G("Seated Leg Curl", "Hamstrings", "3", "12–15"),
    G("Standing Calf Raise", "Calves", "4", "12–15"),
  ],
  Push: [
    G("Bench Press", "Chest, triceps", "3–4", "6–10"),
    G("Overhead Press", "Shoulders", "3", "8–10"),
    G("Incline Dumbbell Press", "Upper chest", "3", "8–12"),
    G("Lateral Raise", "Side delts", "3", "12–15"),
    G("Triceps Pushdown", "Triceps", "3", "10–12"),
    G("Overhead Triceps Extension", "Triceps", "3", "10–12"),
  ],
  Pull: [
    G("Deadlift", "Posterior chain", "3", "5–8"),
    G("Pull-Up / Lat Pulldown", "Back, biceps", "3–4", "8–12"),
    G("Bent-Over Row", "Back", "3", "8–10"),
    G("Face Pull", "Rear delts", "3", "15–20"),
    G("Barbell / Dumbbell Curl", "Biceps", "3", "10–12"),
    G("Hammer Curl", "Biceps, forearms", "3", "10–12"),
  ],
  Legs: [
    G("Barbell Back Squat", "Quads, glutes", "3–4", "6–10"),
    G("Romanian Deadlift", "Hamstrings, glutes", "3", "8–12"),
    G("Hip Thrust", "Glutes", "3", "8–12"),
    G("Leg Press", "Quads", "3", "10–12"),
    G("Seated Leg Curl", "Hamstrings", "3", "12–15"),
    G("Standing Calf Raise", "Calves", "4", "12–15"),
  ],
  "Chest & Back": [
    G("Bench Press", "Chest", "3–4", "6–10"),
    G("Bent-Over Row", "Back", "3–4", "8–10"),
    G("Incline Dumbbell Press", "Upper chest", "3", "8–12"),
    G("Lat Pulldown", "Back", "3", "10–12"),
    G("Cable Fly", "Chest", "3", "12–15"),
    G("Straight-Arm Pulldown", "Lats", "3", "12–15"),
  ],
  "Shoulders & Arms": [
    G("Overhead Press", "Shoulders", "3–4", "8–10"),
    G("Lateral Raise", "Side delts", "3", "12–15"),
    G("Rear Delt Fly", "Rear delts", "3", "12–15"),
    G("Barbell Curl", "Biceps", "3", "10–12"),
    G("Skullcrusher", "Triceps", "3", "10–12"),
    G("Hammer Curl", "Biceps, forearms", "3", "12–15"),
  ],
  Chest: [
    G("Bench Press", "Chest, triceps", "4", "6–10"),
    G("Incline Dumbbell Press", "Upper chest", "3", "8–12"),
    G("Chest Dip", "Lower chest", "3", "8–12"),
    G("Cable Fly", "Chest", "3", "12–15"),
    G("Push-Up", "Chest", "2", "To failure"),
  ],
  Back: [
    G("Deadlift", "Posterior chain", "3", "5–8"),
    G("Pull-Up / Lat Pulldown", "Lats", "3–4", "8–12"),
    G("Bent-Over Row", "Mid-back", "3", "8–10"),
    G("Seated Cable Row", "Back", "3", "10–12"),
    G("Face Pull", "Rear delts", "3", "15–20"),
  ],
  Shoulders: [
    G("Overhead Press", "Shoulders", "4", "6–10"),
    G("Lateral Raise", "Side delts", "4", "12–15"),
    G("Rear Delt Fly", "Rear delts", "3", "12–15"),
    G("Front Raise", "Front delts", "3", "12–15"),
    G("Upright Row", "Traps, delts", "3", "10–12"),
  ],
  Arms: [
    G("Barbell Curl", "Biceps", "3", "8–12"),
    G("Close-Grip Bench Press", "Triceps", "3", "8–12"),
    G("Incline Dumbbell Curl", "Biceps", "3", "10–12"),
    G("Triceps Pushdown", "Triceps", "3", "10–12"),
    G("Hammer Curl", "Biceps, forearms", "3", "12–15"),
    G("Overhead Triceps Extension", "Triceps", "3", "12–15"),
  ],
  // --- Glute & Lower focus days ---
  "Glutes & Hams": [
    G("Hip Thrust", "Glutes", "4", "8–12"),
    G("Romanian Deadlift", "Hamstrings, glutes", "3–4", "8–12"),
    G("Bulgarian Split Squat", "Glutes, quads", "3", "10–12 / leg"),
    G("Cable Glute Kickback", "Glutes", "3", "12–15 / leg"),
    G("Glute Bridge", "Glutes", "3", "15–20"),
    G("Seated Leg Curl", "Hamstrings", "3", "12–15"),
  ],
  "Quads & Calves": [
    G("Barbell Back Squat", "Quads, glutes", "4", "6–10"),
    G("Leg Press", "Quads", "3", "10–12"),
    G("Walking Lunge", "Quads, glutes", "3", "10–12 / leg"),
    G("Leg Extension", "Quads", "3", "12–15"),
    G("Standing Calf Raise", "Calves", "4", "12–15"),
    G("Seated Calf Raise", "Calves", "3", "15–20"),
  ],
  "Upper Body": [
    G("Bench Press", "Chest, triceps", "3", "6–10"),
    G("Lat Pulldown", "Back, biceps", "3", "8–12"),
    G("Overhead Press", "Shoulders", "3", "8–10"),
    G("Seated Cable Row", "Back", "3", "10–12"),
    G("Lateral Raise", "Side delts", "3", "12–15"),
    G("Biceps Curl + Triceps Pushdown", "Arms", "3", "10–12"),
  ],
  Core: [
    G("Plank", "Core", "3", "30–60s"),
    G("Hanging Leg Raise", "Lower abs", "3", "8–12"),
    G("Cable Crunch", "Abs", "3", "12–15"),
    G("Russian Twist", "Obliques", "3", "12–15 / side"),
    G("Back Extension", "Lower back", "3", "12–15"),
  ],
  // --- General days ---
  Cardio: [
    G("Zone-2 (easy pace)", "Heart, base fitness", "—", "20–45 min"),
    G("Intervals / HIIT", "Conditioning", "6–10", "30s hard / 60s easy"),
    G("Incline Walk", "Low-impact base", "—", "20–40 min"),
  ],
  Mobility: [
    G("Hip Flexor Stretch", "Hips", "2", "30–45s / side"),
    G("90/90 Hip Rotations", "Hips", "2", "8–10 / side"),
    G("Cat–Cow", "Spine", "2", "8–10"),
    G("Thoracic Rotation", "Upper back", "2", "8–10 / side"),
    G("Hamstring Stretch", "Hamstrings", "2", "30–45s / side"),
  ],
};

// Fallback when no keyword matches at all: real movements, not abstract slots
// ("Secondary compound" means nothing to a beginner).
const DEFAULT_GUIDE: Exercise[] = [
  G("Barbell Back Squat", "Quads, glutes", "3–4", "6–10"),
  G("Bench Press", "Chest, triceps", "3", "6–10"),
  G("Bent-Over Row", "Back, biceps", "3", "8–10"),
  G("Overhead Press", "Shoulders", "3", "8–10"),
  G("Plank", "Core", "3", "30–60s"),
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, " ").trim();

// Guide keys longest-first so "Chest & Back" wins over "Chest"/"Back" and
// "Upper Body" over "Upper" when a custom label mentions both words.
const GUIDE_KEYS = Object.keys(EXERCISE_GUIDE).sort(
  (a, b) => norm(b).length - norm(a).length,
);

/**
 * Match custom day labels ("Push 1", "Leg Day", "Chest+Tris") to the curated
 * guide by keyword, instead of requiring an exact preset name.
 */
export function guideForDay(label: string): Exercise[] {
  const exact = EXERCISE_GUIDE[label];
  if (exact) return exact;
  const l = norm(label);
  if (!l) return DEFAULT_GUIDE;
  for (const key of GUIDE_KEYS) {
    const k = norm(key);
    if (l === k || l.includes(k) || k.includes(l)) return EXERCISE_GUIDE[key];
  }
  // Common synonyms that don't literally contain a key.
  if (/\bleg|quad|glute|hamstring|calv/.test(l)) return EXERCISE_GUIDE.Legs;
  if (/\bchest|pec|bench/.test(l)) return EXERCISE_GUIDE.Chest;
  if (/\bback|lat|row/.test(l)) return EXERCISE_GUIDE.Back;
  if (/\bshoulder|delt/.test(l)) return EXERCISE_GUIDE.Shoulders;
  if (/\barm|bicep|tricep/.test(l)) return EXERCISE_GUIDE.Arms;
  if (/\brun|hiit|conditioning|cycle|bike|swim/.test(l)) return EXERCISE_GUIDE.Cardio;
  if (/\bstretch|yoga|recovery/.test(l)) return EXERCISE_GUIDE.Mobility;
  return DEFAULT_GUIDE;
}

// Flat, de-duplicated library built from every day's curated exercises — used
// for the "add exercise" search when building a program.
const _lib = new Map<string, string>();
for (const list of Object.values(EXERCISE_GUIDE)) {
  for (const e of list) if (!_lib.has(e.name)) _lib.set(e.name, e.target);
}
export const EXERCISE_LIBRARY: { name: string; target: string }[] = [..._lib.entries()]
  .map(([name, target]) => ({ name, target }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function searchExercises(
  q: string,
  limit = 8,
): { name: string; target: string }[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return EXERCISE_LIBRARY.filter(
    (e) =>
      e.name.toLowerCase().includes(s) || e.target.toLowerCase().includes(s),
  ).slice(0, limit);
}

/** Days that are recovery-only and shouldn't show an exercise list. */
export function isRestDay(label: string): boolean {
  return label.toLowerCase() === "rest";
}
