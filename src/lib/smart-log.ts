// Smart Log — the Pro feature that turns a spoken/typed "brain-dump" into
// structured entries via Claude tool-use. PURE module: the entry shapes, the
// tool schema Claude fills in, the system-prompt builder, and a DEFENSIVE
// parser for the model's output. The network call lives in the route; the DB
// writes live in the save action. v1 extracts meals and workouts; anything else
// becomes a journal note (gaming/supplements/goals need existing rows — next).

export type SmartMeal = {
  type: "meal";
  name: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};
export type SmartWorkout = {
  type: "workout";
  title: string;
  category: string;
  durationMin: number | null;
  notes: string | null;
};
export type SmartNote = { type: "note"; body: string };
export type SmartEntry = SmartMeal | SmartWorkout | SmartNote;

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

// The tool Claude must call. Optional fields are simply omitted when unknown —
// no nullable-union schema (broader model compatibility); the parser fills gaps.
export const LOG_TOOL = {
  name: "log_entries",
  description:
    "Record the structured entries extracted from what the user said they did today.",
  input_schema: {
    type: "object",
    properties: {
      entries: {
        type: "array",
        description: "One object per distinct thing the user reported.",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["meal", "workout", "note"] },
            name: { type: "string", description: "meal: the food/dish name" },
            mealType: { type: "string", enum: [...MEAL_TYPES] },
            calories: { type: "number" },
            protein: { type: "number", description: "grams" },
            carbs: { type: "number", description: "grams" },
            fat: { type: "number", description: "grams" },
            title: { type: "string", description: "workout: a short title" },
            category: {
              type: "string",
              description: "workout: must be one of the allowed day categories given to you",
            },
            durationMin: { type: "number" },
            notes: { type: "string" },
            body: { type: "string", description: "note: free text for anything not a meal or workout" },
          },
          required: ["type"],
        },
      },
    },
    required: ["entries"],
  },
} as const;

export function buildSmartLogSystem(allowedCategories: string[]): string {
  const cats = allowedCategories.length ? allowedCategories.join(", ") : "Cardio, Mobility, Rest";
  return `You convert a person's short spoken or typed recap of their day into structured log entries for a fitness/life-tracking app. Call the log_entries tool exactly once.

Rules:
- Extract only what the user actually reported. Never invent activities, foods, or numbers.
- MEAL: one entry per distinct food/dish. Set mealType when implied (defaults to "snack"). If a food is common and clearly identifiable, you may give a reasonable rough estimate for calories/protein/carbs/fat in grams; if you are unsure, omit the number rather than guess wildly.
- WORKOUT: one entry per training session. "category" MUST be chosen from these allowed day categories: ${cats}. Pick the closest fit; if nothing fits, use "Cardio". Put exercises/sets/feeling into "notes". Include durationMin only if stated.
- NOTE: anything that is not clearly a meal or a workout (gaming, mood, sleep, supplements, goals, general reflection) becomes a single "note" entry with the relevant text in "body". Combine multiple stray remarks into one note.
- Be conservative and concise. If the input is empty or unintelligible, return an empty entries array.`;
}

// ---- defensive parsing of the model's tool input -------------------------
const clampNum = (v: unknown, max = 100000): number | null => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
};
const str = (v: unknown, max: number): string => String(v ?? "").trim().slice(0, max);

/** Normalize Claude's tool input into validated SmartEntry[]. */
export function parseEntries(raw: unknown): SmartEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: SmartEntry[] = [];
  for (const item of raw.slice(0, 30)) {
    const e = item as Record<string, unknown>;
    if (e?.type === "meal") {
      const name = str(e.name, 80);
      if (!name) continue;
      const mealType = (MEAL_TYPES as readonly string[]).includes(String(e.mealType))
        ? (e.mealType as SmartMeal["mealType"])
        : "snack";
      out.push({
        type: "meal",
        name,
        mealType,
        calories: clampNum(e.calories, 20000),
        protein: clampNum(e.protein, 2000),
        carbs: clampNum(e.carbs, 2000),
        fat: clampNum(e.fat, 2000),
      });
    } else if (e?.type === "workout") {
      const category = str(e.category, 40) || "Cardio";
      const title = str(e.title, 120) || category;
      out.push({
        type: "workout",
        title,
        category,
        durationMin: clampNum(e.durationMin, 1440),
        notes: str(e.notes, 500) || null,
      });
    } else if (e?.type === "note") {
      const body = str(e.body, 2000);
      if (body) out.push({ type: "note", body });
    }
  }
  return out;
}
