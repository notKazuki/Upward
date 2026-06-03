export type Mood = "great" | "good" | "okay" | "low" | "rough";

export const MOODS: { id: Mood; label: string; color: string }[] = [
  { id: "great", label: "Great", color: "#7c9473" },
  { id: "good", label: "Good", color: "#5f8aa8" },
  { id: "okay", label: "Okay", color: "#c9a23f" },
  { id: "low", label: "Low", color: "#d4825a" },
  { id: "rough", label: "Rough", color: "#9a6a8a" },
];

export function moodMeta(id: string | null) {
  return MOODS.find((m) => m.id === id) ?? null;
}

export type JournalEntry = {
  id: string;
  entry_date: string;
  mood: Mood | null;
  body: string | null;
  image_paths: string[];
  created_at: string;
};

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
