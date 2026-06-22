// Smart Log — the Pro feature that turns a spoken/typed "brain-dump" into
// structured entries via Claude tool-use. PURE module: the entry shapes, the
// tool schema Claude fills in, the system-prompt builder, a DEFENSIVE parser,
// and a name→row resolver. The network call lives in the route; the DB writes
// live in the save action. Meals & workouts stand alone; gaming/supplements/
// goals reference the user's EXISTING rows (resolved by name).

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
export type SmartGaming = {
  type: "gaming";
  game: string;
  matches: number | null;
  wins: number | null;
  losses: number | null;
  minutes: number | null;
  matched?: boolean; // set by the resolver: does it map to one of the user's games?
};
export type SmartSupplement = { type: "supplement"; supplement: string; matched?: boolean };
export type SmartGoal = { type: "goal"; goal: string; value: number | null; matched?: boolean };
export type SmartNote = { type: "note"; body: string };
export type SmartEntry =
  | SmartMeal
  | SmartWorkout
  | SmartGaming
  | SmartSupplement
  | SmartGoal
  | SmartNote;

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
            type: {
              type: "string",
              enum: ["meal", "workout", "gaming", "supplement", "goal", "note"],
            },
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
            game: { type: "string", description: "gaming: the game name (use one the user tracks)" },
            matches: { type: "number" },
            wins: { type: "number" },
            losses: { type: "number" },
            minutes: { type: "number" },
            supplement: {
              type: "string",
              description: "supplement: the supplement name (use one the user tracks)",
            },
            goal: { type: "string", description: "goal: the goal title (use one the user tracks)" },
            value: { type: "number", description: "goal: amount of progress, if a number was given" },
            body: { type: "string", description: "note: free text for anything not covered above" },
          },
          required: ["type"],
        },
      },
    },
    required: ["entries"],
  },
} as const;

export type Vocab = {
  games: { id: string; name: string; slug?: string | null }[];
  supplements: { id: string; name: string }[];
  goals: { id: string; title: string; type: string }[];
};

export function buildSmartLogSystem(
  allowedCategories: string[],
  vocab?: { games: string[]; supplements: string[]; goals: string[] },
): string {
  const cats = allowedCategories.length ? allowedCategories.join(", ") : "Cardio, Mobility, Rest";
  const list = (label: string, items: string[]) =>
    items.length ? `\n- The user's ${label}: ${items.join(", ")}. Use these exact names when referring to them; if they mention something not in the list, fall back to a note.` : "";
  const known = vocab
    ? list("games", vocab.games) + list("supplements", vocab.supplements) + list("goals", vocab.goals)
    : "";

  return `You convert a person's short spoken or typed recap of their day into structured log entries for a fitness/life-tracking app. Call the log_entries tool exactly once.

Rules:
- Extract only what the user actually reported. Never invent activities, foods, or numbers.
- MEAL: one entry per distinct food/dish. Set mealType when implied (defaults to "snack"). If a food is common and clearly identifiable, you may give a reasonable rough estimate for calories/protein/carbs/fat in grams; if unsure, omit the number rather than guess wildly.
- WORKOUT: one entry per training session. "category" MUST be one of these allowed day categories: ${cats}. Pick the closest fit; if nothing fits, use "Cardio". Put exercises/sets/feeling into "notes". Include durationMin only if stated.
- GAMING: when they mention playing a tracked game, set "game" to the matching name and fill matches/wins/losses/minutes when stated.
- SUPPLEMENT: when they mention taking a tracked supplement, set "supplement" to the matching name.
- GOAL: when they mention progress on a tracked goal, set "goal" to the matching title and "value" to the amount if a number was given.
- NOTE: anything not covered above (mood, sleep, general reflection, or things that don't match a tracked game/supplement/goal) becomes a single "note" entry with the text in "body".
- Be conservative and concise. If the input is empty or unintelligible, return an empty entries array.${known}`;
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
    } else if (e?.type === "gaming") {
      const game = str(e.game, 80);
      if (!game) continue;
      out.push({
        type: "gaming",
        game,
        matches: clampNum(e.matches, 200),
        wins: clampNum(e.wins, 200),
        losses: clampNum(e.losses, 200),
        minutes: clampNum(e.minutes, 1440),
      });
    } else if (e?.type === "supplement") {
      const supplement = str(e.supplement, 80);
      if (!supplement) continue;
      out.push({ type: "supplement", supplement });
    } else if (e?.type === "goal") {
      const goal = str(e.goal, 120);
      if (!goal) continue;
      out.push({ type: "goal", goal, value: clampNum(e.value, 1000000) });
    } else if (e?.type === "note") {
      const body = str(e.body, 2000);
      if (body) out.push({ type: "note", body });
    }
  }
  return out;
}

// ---- name → row resolution (for the FK-backed types) ---------------------
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Best-effort match of a spoken name to one of the user's rows. */
export function matchByName<T>(name: string, items: T[], key: (t: T) => string): T | null {
  const n = norm(name);
  if (!n) return null;
  const exact = items.find((i) => norm(key(i)) === n);
  if (exact) return exact;
  return (
    items.find((i) => {
      const k = norm(key(i));
      return k.length > 1 && (k.includes(n) || n.includes(k));
    }) ?? null
  );
}

/** Annotate FK-backed entries with whether they map to one of the user's rows
 * (so the review card can flag unmatched ones). Pure — used by route + save. */
export function annotateMatches(entries: SmartEntry[], vocab: Vocab): SmartEntry[] {
  return entries.map((e) => {
    if (e.type === "gaming") {
      const g = matchByName(e.game, vocab.games, (x) => x.name) ?? matchByName(e.game, vocab.games, (x) => x.slug ?? "");
      return { ...e, matched: Boolean(g) };
    }
    if (e.type === "supplement") {
      return { ...e, matched: Boolean(matchByName(e.supplement, vocab.supplements, (x) => x.name)) };
    }
    if (e.type === "goal") {
      return { ...e, matched: Boolean(matchByName(e.goal, vocab.goals, (x) => x.title)) };
    }
    return e;
  });
}
