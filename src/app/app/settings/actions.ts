"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import type { UnitPref } from "@/lib/onboarding";

export async function updateUnitPref(
  pref: string,
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return { error: "Session expired." };

  const value: UnitPref = pref === "imperial" ? "imperial" : "metric";
  const { error } = await supabase
    .from("profiles")
    .update({ unit_pref: value })
    .eq("id", user.id);
  if (error) return { error: "Couldn't save your preference." };

  revalidatePath("/app/settings");
  revalidatePath("/app", "layout");
  return { ok: true };
}
