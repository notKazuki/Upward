"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import {
  usernameCooldownMs,
  validateDisplayName,
  validateUsername,
} from "@/lib/username";

export async function checkUsernameAvailable(
  raw: string,
): Promise<{ available: boolean; error?: string }> {
  const name = raw.trim();
  const invalid = validateUsername(name);
  if (invalid) return { available: false, error: invalid };

  const user = await currentUser();
  if (!user) return { available: false, error: "Session expired." };

  const supabase = await createClient();
  // RLS hides other users' rows, so a normal select can't see a clash. Ask a
  // SECURITY DEFINER function that checks across everyone and returns a boolean.
  const { data, error } = await supabase.rpc("username_available", {
    candidate: name,
  });

  // If the function isn't installed yet, don't falsely claim "taken" — the
  // unique index still backstops it on save.
  if (error) return { available: true };
  return { available: Boolean(data) };
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

  // Current username + when it last changed (for the 30-day cooldown).
  const { data: prof } = await supabase
    .from("profiles")
    .select("username, username_changed_at")
    .eq("id", user.id)
    .maybeSingle();
  const current = (prof?.username as string | null) ?? null;
  const changedAt = (prof?.username_changed_at as string | null) ?? null;

  // No real change → nothing to do.
  if (current && current.toLowerCase() === name.toLowerCase()) {
    return { ok: true };
  }

  // Changing an existing username is rate-limited; first claim is free.
  if (current) {
    const remaining = usernameCooldownMs(changedAt);
    if (remaining > 0) {
      const days = Math.ceil(remaining / 86_400_000);
      return {
        error: `You can change your username again in ${days} day${
          days === 1 ? "" : "s"
        }.`,
      };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username: name, username_changed_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    // Unique-violation code or message → taken.
    if (error.code === "23505" || /duplicate|unique/i.test(error.message)) {
      return { error: "That username is taken — try another." };
    }
    return { error: "Couldn't save. Make sure you've run supabase/display-name.sql." };
  }

  revalidatePath("/app/account");
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function updateDisplayName(
  raw: string,
): Promise<{ ok?: boolean; error?: string }> {
  const name = raw.trim();
  const invalid = validateDisplayName(name);
  if (invalid) return { error: invalid };

  const user = await currentUser();
  if (!user) return { error: "Session expired." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name })
    .eq("id", user.id);

  if (error) {
    return { error: "Couldn't save. Make sure you've run supabase/display-name.sql." };
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
