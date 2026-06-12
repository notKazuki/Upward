// Server-only Pro entitlement reads. `is_pro` on the profile is the source of
// truth; until Stripe is wired (isStripeConfigured), it's toggled manually.
// Tolerant of the column not existing yet (pre-migration → not Pro).

import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { currentUser } from "@/lib/auth";

/** True once a live Stripe secret is present — gates the real checkout flow. */
export const isStripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

/** The signed-in user's Pro status. */
export async function getProStatus(): Promise<{ pro: boolean }> {
  const user = await currentUser();
  if (!user) return { pro: false };
  const db = await createClient();
  const { data, error } = await db
    .from("profiles")
    .select("is_pro")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return { pro: false }; // column may not exist pre-migration
  return { pro: Boolean(data?.is_pro) };
}

/** Another user's Pro status (e.g. to render a Pro badge on their profile). */
export async function isProUser(userId: string): Promise<boolean> {
  if (!isAdminConfigured) return false;
  const db = createAdminClient();
  const { data, error } = await db
    .from("profiles")
    .select("is_pro")
    .eq("id", userId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data?.is_pro);
}
