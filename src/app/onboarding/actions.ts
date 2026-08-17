"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ageFromDob, MIN_AGE } from "@/lib/onboarding";

export type OnboardingInput = {
  dob: string;
  gender: string;
  heightCm: number | null;
  weightKg: number | null;
  unitPref: "metric" | "imperial";
  uses: string[];
};

export async function completeOnboarding(
  input: OnboardingInput,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Your session expired. Please sign in again." };
  if (!input.dob) return { error: "Date of birth is required." };
  if (ageFromDob(input.dob) < MIN_AGE)
    return { error: `You must be at least ${MIN_AGE} to use Upward.` };
  if (!input.gender) return { error: "Please choose an option." };
  if (!input.uses?.length)
    return { error: "Pick at least one thing to track." };

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      dob: input.dob,
      gender: input.gender,
      height_cm: input.heightCm,
      weight_kg: input.weightKg,
      unit_pref: input.unitPref,
      uses: input.uses,
      onboarded: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    return {
      error:
        "Couldn't save your profile. Make sure the profiles table exists (see supabase/profiles.sql).",
    };
  }

  // Clear the cached (pre-onboarding) versions of these routes, then navigate
  // server-side so the client doesn't reuse the stale "redirect to onboarding"
  // entry for /app.
  revalidatePath("/app", "layout");
  revalidatePath("/onboarding");
  redirect("/app");
}
