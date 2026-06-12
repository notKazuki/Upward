"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { getOwnProgress } from "@/lib/progress-data";
import { canEquip, type Cosmetics } from "@/lib/cosmetics";

/** Equip a title and/or accent. Server-validates that it's actually unlocked. */
export async function saveCosmetics(next: Cosmetics): Promise<{ ok: boolean; error?: string }> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const progress = await getOwnProgress();
  const level = progress?.level.level ?? 1;
  const earned = new Set((progress?.earned ?? []).map((e) => e.id));
  if (!canEquip(next, level, earned)) return { ok: false, error: "That isn't unlocked yet." };

  const supabase = await createClient();
  // Merge onto existing so a partial update doesn't wipe the other field.
  const { data: row } = await supabase
    .from("profiles")
    .select("cosmetics")
    .eq("id", user.id)
    .maybeSingle();
  const merged = { ...((row?.cosmetics as Cosmetics | null) ?? {}), ...next };

  const { error } = await supabase.from("profiles").update({ cosmetics: merged }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/character");
  return { ok: true };
}
