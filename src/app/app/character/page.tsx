import { redirect } from "next/navigation";

// The RPG character sheet was retired in the calm-tracker restructure. Its
// coach half now lives at /app/coach; stats live at /app/stats.
export default function CharacterPage() {
  redirect("/app/coach");
}
