// Server-only reader for the user's experience mode. Tolerant of the column
// not existing yet (pre-migration → gamified). Never import into a client file.

import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { asExperience, DEFAULT_EXPERIENCE, type Experience } from "@/lib/experience";

export async function getExperience(): Promise<Experience> {
  const user = await currentUser();
  if (!user) return DEFAULT_EXPERIENCE;
  const db = await createClient();
  const { data, error } = await db
    .from("profiles")
    .select("experience")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return DEFAULT_EXPERIENCE; // column may not exist pre-migration
  return asExperience(data?.experience);
}
