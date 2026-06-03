"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { slugify, type GameGoals } from "@/lib/gaming";
import { ymdInTz } from "@/lib/today";
import {
  fetchOpenDotaProfile,
  fetchRecentMatches,
  parseOpenDotaId,
  won,
} from "@/lib/opendota";

async function uid() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function addGame(input: {
  name: string;
  slug?: string;
  trackerUrl?: string;
}): Promise<{ error?: string; id?: string }> {
  const { supabase, user } = await uid();
  if (!user) return { error: "Your session expired. Please sign in again." };

  const name = input.name?.trim();
  if (!name) return { error: "Give the game a name." };
  const slug = input.slug?.trim() || slugify(name);

  const trackerUrl = input.trackerUrl?.trim() || null;
  if (trackerUrl && !/^https?:\/\//i.test(trackerUrl)) {
    return { error: "Tracker link must start with http(s)://" };
  }

  const { data, error } = await supabase
    .from("games")
    .insert({ user_id: user.id, name, slug, tracker_url: trackerUrl })
    .select("id")
    .single();

  if (error) {
    return {
      error: "Couldn't add the game. Make sure you've run supabase/gaming.sql.",
    };
  }

  revalidatePath("/app/gaming");
  return { id: data.id as string };
}

export async function deleteGame(formData: FormData): Promise<void> {
  const { supabase, user } = await uid();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("games").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/app/gaming");
  redirect("/app/gaming");
}

export async function updateGoals(input: {
  gameId: string;
  goals: GameGoals;
}): Promise<{ error?: string }> {
  const { supabase, user } = await uid();
  if (!user) return { error: "Your session expired." };

  const { error } = await supabase
    .from("games")
    .update({ goals: input.goals })
    .eq("id", input.gameId)
    .eq("user_id", user.id);

  if (error) return { error: "Couldn't save goals." };
  revalidatePath(`/app/gaming/${input.gameId}`);
  revalidatePath("/app/gaming");
  return {};
}

export type SessionState = { ok?: boolean; error?: string; ts?: number };

export async function addSession(
  _prev: SessionState,
  formData: FormData,
): Promise<SessionState> {
  const { supabase, user } = await uid();
  if (!user) return { error: "Your session expired. Please sign in again." };

  const game_id = String(formData.get("game_id") ?? "");
  const played_on = String(formData.get("played_on") ?? "");
  if (!game_id) return { error: "Missing game." };
  if (!played_on) return { error: "Pick a date." };

  const num = (k: string) => {
    const n = Number(String(formData.get(k) ?? "").trim() || "0");
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  };
  const hours = Number(String(formData.get("hours") ?? "").trim() || "0");
  const minutes = Number.isFinite(hours) && hours > 0 ? Math.round(hours * 60) : 0;

  const rank = String(formData.get("rank") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const { error } = await supabase.from("game_sessions").insert({
    user_id: user.id,
    game_id,
    played_on,
    matches: num("matches"),
    wins: num("wins"),
    losses: num("losses"),
    minutes,
    rank,
    notes,
  });

  if (error) return { error: "Couldn't save the session." };

  revalidatePath(`/app/gaming/${game_id}`);
  revalidatePath("/app/gaming");
  return { ok: true, ts: Date.now() };
}

// --- Auto-sync (Dota 2 via OpenDota) --------------------------------------

export async function connectDota(input: {
  gameId: string;
  account: string;
}): Promise<{ ok?: boolean; error?: string; name?: string | null }> {
  const { supabase, user } = await uid();
  if (!user) return { error: "Your session expired." };

  const id = parseOpenDotaId(input.account);
  if (!id) {
    return {
      error:
        "Enter your numeric Dota account ID, or paste your OpenDota / Dotabuff profile link.",
    };
  }
  const prof = await fetchOpenDotaProfile(id);
  if (!prof.ok) {
    return {
      error:
        "Couldn't find that account on OpenDota. Check the ID and make sure your match history is public.",
    };
  }

  const { error } = await supabase
    .from("games")
    .update({ provider: "opendota", provider_id: id })
    .eq("id", input.gameId)
    .eq("user_id", user.id);
  if (error) {
    return { error: "Couldn't save. Make sure you've run supabase/game-sync.sql." };
  }
  revalidatePath(`/app/gaming/${input.gameId}`);
  return { ok: true, name: prof.name };
}

export async function disconnectProvider(
  gameId: string,
): Promise<{ ok?: boolean }> {
  const { supabase, user } = await uid();
  if (!user) return {};
  await supabase
    .from("games")
    .update({ provider: null, provider_id: null, last_synced_at: null })
    .eq("id", gameId)
    .eq("user_id", user.id);
  revalidatePath(`/app/gaming/${gameId}`);
  return { ok: true };
}

export async function syncGame(
  gameId: string,
): Promise<{ ok?: boolean; error?: string; imported?: number }> {
  const { supabase, user } = await uid();
  if (!user) return { error: "Your session expired." };

  const { data: game } = await supabase
    .from("games")
    .select("id, provider, provider_id")
    .eq("id", gameId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!game) return { error: "Game not found." };
  if (game.provider !== "opendota" || !game.provider_id) {
    return { error: "This game isn't connected for sync." };
  }

  const matches = await fetchRecentMatches(game.provider_id as string);
  if (matches === null) {
    return { error: "OpenDota is unavailable right now — try again in a minute." };
  }

  // Dedupe against already-imported matches.
  const { data: existing } = await supabase
    .from("game_sessions")
    .select("external_id")
    .eq("game_id", gameId)
    .not("external_id", "is", null);
  const have = new Set((existing ?? []).map((r) => String(r.external_id)));

  const zone = decodeURIComponent((await cookies()).get("tz")?.value || "") || "UTC";

  const rows = matches
    .filter((m) => !have.has(String(m.match_id)))
    .map((m) => {
      const w = won(m);
      return {
        user_id: user.id,
        game_id: gameId,
        played_on: ymdInTz(zone, new Date(m.start_time * 1000)),
        matches: 1,
        wins: w ? 1 : 0,
        losses: w ? 0 : 1,
        minutes: Math.round(m.duration / 60),
        rank: null,
        notes: `${m.kills}/${m.deaths}/${m.assists} KDA`,
        external_id: String(m.match_id),
        source: "opendota",
      };
    });

  let imported = 0;
  if (rows.length > 0) {
    const { error } = await supabase.from("game_sessions").insert(rows);
    if (error && error.code !== "23505") {
      return {
        error: "Couldn't save synced matches. Make sure you've run supabase/game-sync.sql.",
      };
    }
    if (!error) imported = rows.length;
  }

  await supabase
    .from("games")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", gameId)
    .eq("user_id", user.id);
  revalidatePath(`/app/gaming/${gameId}`);
  revalidatePath("/app/gaming");
  return { ok: true, imported };
}

export async function deleteSession(formData: FormData): Promise<void> {
  const { supabase, user } = await uid();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  const game_id = String(formData.get("game_id") ?? "");
  if (!id) return;
  await supabase
    .from("game_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath(`/app/gaming/${game_id}`);
  revalidatePath("/app/gaming");
}
