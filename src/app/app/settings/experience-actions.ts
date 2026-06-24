"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { asExperience } from "@/lib/experience";

/** Switch the user's experience mode (gamified | classic). */
export async function saveExperience(value: string): Promise<{ ok?: boolean; error?: string }> {
  const user = await currentUser();
  if (!user) return { error: "Session expired." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ experience: asExperience(value) })
    .eq("id", user.id);
  if (error) return { error: "Couldn't save. Make sure you've run supabase/experience.sql." };
  // Re-render the whole app shell so the palette, nav and atmosphere update.
  revalidatePath("/app", "layout");
  return { ok: true };
}
