// Conversational Sherpa endpoint. POST a {messages:[{role,content}]} thread;
// streams back the Sherpa's reply as plain text. Dormant (503) until an
// ANTHROPIC_API_KEY is set. Auth-gated; grounds each reply in the caller's
// live character context.

import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { getCharacter } from "@/lib/character-data";
import { getOwnProgress } from "@/lib/progress-data";
import { buildSkillTrees } from "@/lib/skill-trees";
import {
  isAiSherpaConfigured,
  buildSherpaSystem,
  fetchSherpaStream,
  type ChatMessage,
} from "@/lib/sherpa-ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!isAiSherpaConfigured) {
    return Response.json({ error: "The conversational Sherpa isn't enabled yet." }, { status: 503 });
  }

  // Validate the thread: user/assistant turns only, trimmed, starting with user.
  const body = (await request.json().catch(() => null)) as { messages?: unknown } | null;
  const raw = Array.isArray(body?.messages) ? body!.messages : [];
  const messages: ChatMessage[] = (raw as ChatMessage[])
    .filter(
      (m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim(),
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
    .slice(-20);
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (messages.length === 0) {
    return Response.json({ error: "no message" }, { status: 400 });
  }

  // Live character context for grounding.
  const supabase = await createClient();
  const [character, progress, profileRes] = await Promise.all([
    getCharacter(),
    getOwnProgress(),
    supabase.from("profiles").select("display_name, username").eq("id", user.id).maybeSingle(),
  ]);
  if (!character || !progress) {
    return Response.json({ error: "no character yet" }, { status: 503 });
  }
  const name =
    (profileRes.data?.display_name as string | null) ||
    (profileRes.data?.username as string | null) ||
    "the climber";
  const paths = buildSkillTrees(progress.stats, new Set(progress.earned.map((e) => e.id)));
  const system = buildSherpaSystem({ name, character, level: progress.level, rank: progress.rank, paths });

  const upstream = await fetchSherpaStream(system, messages).catch(() => null);
  if (!upstream || !upstream.ok || !upstream.body) {
    return Response.json({ error: "The Sherpa is unreachable right now." }, { status: 502 });
  }

  // Parse the upstream SSE and re-emit only the text deltas.
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const payload = t.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
            controller.enqueue(encoder.encode(ev.delta.text as string));
          }
        } catch {
          /* ignore partial/non-JSON keepalive lines */
        }
      }
    },
    cancel() {
      void reader.cancel();
    },
  });

  return new Response(stream, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
