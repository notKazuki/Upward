// Smart Log extraction endpoint (Pro). POST { transcript } → structured entries
// via Claude tool-use. Dormant (503) until ANTHROPIC_API_KEY is set; 403 for
// non-Pro. Returns { entries } for the review card — it never writes anything
// (the save action does, after the user confirms).

import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { getProStatus } from "@/lib/pro-data";
import { isAiSherpaConfigured } from "@/lib/sherpa-ai";
import { GENERAL_DAYS } from "@/lib/workouts";
import { LOG_TOOL, buildSmartLogSystem, parseEntries } from "@/lib/smart-log";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "claude-opus-4-8";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { pro } = await getProStatus();
  if (!pro) {
    return Response.json({ error: "Smart Log is a Pro feature." }, { status: 403 });
  }
  if (!isAiSherpaConfigured) {
    return Response.json({ error: "Smart Log isn’t enabled yet." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { transcript?: unknown } | null;
  const transcript = String(body?.transcript ?? "").trim().slice(0, 4000);
  if (!transcript) return Response.json({ error: "Nothing to log." }, { status: 400 });

  // Allowed workout day-categories so the model maps to the user's split.
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("workout_days")
    .eq("id", user.id)
    .maybeSingle();
  const allowed = [...((profile?.workout_days as string[] | null) ?? []), ...GENERAL_DAYS];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system: buildSmartLogSystem(allowed),
      tools: [LOG_TOOL],
      tool_choice: { type: "tool", name: "log_entries" },
      messages: [{ role: "user", content: transcript }],
    }),
  }).catch(() => null);

  if (!res || !res.ok) {
    return Response.json({ error: "The Sherpa couldn’t read that right now." }, { status: 502 });
  }

  const data = (await res.json().catch(() => null)) as {
    content?: { type: string; name?: string; input?: { entries?: unknown } }[];
  } | null;
  const toolUse = data?.content?.find((c) => c.type === "tool_use" && c.name === "log_entries");
  const entries = parseEntries(toolUse?.input?.entries);

  return Response.json({ entries });
}
