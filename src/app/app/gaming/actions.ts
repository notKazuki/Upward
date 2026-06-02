"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify, type GameGoals } from "@/lib/gaming";

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
