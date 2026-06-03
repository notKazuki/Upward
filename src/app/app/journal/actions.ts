"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import type { Mood } from "@/lib/journal";

const MOODS: Mood[] = ["great", "good", "okay", "low", "rough"];

export async function addJournalEntry(input: {
  date: string;
  mood?: string | null;
  body?: string | null;
  imagePaths?: string[];
}): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return { error: "Session expired." };

  if (!input.date) return { error: "Pick a date." };
  const mood = MOODS.includes(input.mood as Mood) ? input.mood : null;
  const body = (input.body ?? "").trim().slice(0, 5000) || null;
  // Only accept paths inside the user's own folder.
  const imagePaths = (input.imagePaths ?? [])
    .filter((p) => typeof p === "string" && p.startsWith(`${user.id}/`))
    .slice(0, 6);

  if (!body && !mood && imagePaths.length === 0) {
    return { error: "Write something, pick a mood, or add a photo." };
  }

  const { error } = await supabase.from("journal_entries").insert({
    user_id: user.id,
    entry_date: input.date,
    mood,
    body,
    image_paths: imagePaths,
  });
  if (error) {
    return { error: "Couldn't save. Make sure you've run supabase/journal.sql." };
  }
  revalidatePath("/app/journal");
  return { ok: true };
}

export async function deleteJournalEntry(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Remove any photos from storage first, then the row.
  const { data: entry } = await supabase
    .from("journal_entries")
    .select("image_paths")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  const paths = (entry?.image_paths as string[] | null) ?? [];
  if (paths.length > 0) {
    await supabase.storage.from("journal").remove(paths);
  }

  await supabase.from("journal_entries").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/app/journal");
}
