export type Workout = {
  id: string;
  performed_on: string;
  category: string; // a "day" label: a split day, a general tag, or legacy slug
  title: string;
  duration_min: number | null;
  notes: string | null;
  created_at: string;
};

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

/** Monday-based start of the current week, as a YYYY-MM-DD string. */
export function startOfWeekISO(): string {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
