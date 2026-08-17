import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { getProStatus } from "@/lib/pro-data";
import { FREE_HISTORY_DAYS } from "@/lib/pro";

// Downloads everything the signed-in user has logged as a single JSON file.
// RLS scopes every query to the user, so no one else's data can leak.
//
// Tiering matches the pricing table: Pro exports the full history, free
// exports the most recent FREE_HISTORY_DAYS of it. Config-style tables
// (profile, saved exercises, games, goals, the supplement stack) are never
// truncated — they describe the account, not its history, and a partial copy
// would be misleading.
const TABLES: { name: string; dateCol?: string }[] = [
  { name: "profiles" },
  { name: "workouts", dateCol: "performed_on" },
  { name: "custom_exercises" },
  { name: "meals", dateCol: "eaten_on" },
  { name: "favorites" },
  { name: "games" },
  { name: "game_sessions", dateCol: "played_on" },
  { name: "calendar_events", dateCol: "date" },
  { name: "goals" },
  { name: "goal_logs", dateCol: "logged_on" },
  { name: "supplements" },
  { name: "supplement_logs", dateCol: "taken_on" },
  { name: "journal_entries", dateCol: "entry_date" },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export async function GET() {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const supabase = await createClient();
  const { pro } = await getProStatus();
  const since = pro ? null : daysAgo(FREE_HISTORY_DAYS);

  const out: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    history: pro
      ? { scope: "full" }
      : { scope: "recent", days: FREE_HISTORY_DAYS, since },
  };

  for (const { name, dateCol } of TABLES) {
    let query = supabase.from(name).select("*");
    if (since && dateCol) query = query.gte(dateCol, since);
    const { data, error } = await query;
    out[name] = error ? [] : (data ?? []);
  }

  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(out, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="upward-export-${date}.json"`,
      "cache-control": "no-store",
    },
  });
}
