import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";

// Downloads everything the signed-in user has logged as a single JSON file.
// RLS scopes every query to the user, so no one else's data can leak.
const TABLES = [
  "profiles",
  "workouts",
  "custom_exercises",
  "meals",
  "favorites",
  "games",
  "game_sessions",
  "calendar_events",
  "goals",
  "goal_logs",
  "supplements",
  "supplement_logs",
  "journal_entries",
];

export async function GET() {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const supabase = await createClient();
  const out: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email },
  };

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    out[table] = error ? [] : (data ?? []);
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
