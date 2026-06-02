"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { validateUsername } from "@/lib/username";

export async function checkUsernameAvailable(
  raw: string,
): Promise<{ available: boolean; error?: string }> {
  const name = raw.trim();
  const invalid = validateUsername(name);
  if (invalid) return { available: false, error: invalid };

  const user = await currentUser();
  if (!user) return { available: false, error: "Session expired." };

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", name)
    .neq("id", user.id)
    .maybeSingle();

  return { available: !data };
}

export async function updateUsername(
  raw: string,
): Promise<{ ok?: boolean; error?: string }> {
  const name = raw.trim();
  const invalid = validateUsername(name);
  if (invalid) return { error: invalid };

  const user = await currentUser();
  if (!user) return { error: "Session expired. Please sign in again." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ username: name })
    .eq("id", user.id);

  if (error) {
    // Unique-violation code or message → taken.
    if (error.code === "23505" || /duplicate|unique/i.test(error.message)) {
      return { error: "That username is taken — try another." };
    }
    return { error: "Couldn't save your username." };
  }

  revalidatePath("/app/account");
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function updateAvatar(
  url: string,
): Promise<{ ok?: boolean; error?: string }> {
  const user = await currentUser();
  if (!user) return { error: "Session expired." };
  if (!/^https?:\/\//.test(url)) return { error: "Invalid image URL." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", user.id);

  if (error) return { error: "Couldn't save your photo." };

  revalidatePath("/app/account");
  revalidatePath("/app", "layout");
  return { ok: true };
}
