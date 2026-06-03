import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

// SERVER-ONLY. Never import this into a Client Component.
//
// Uses the Supabase service_role key, which has full database access and
// bypasses RLS. It is read from a NON-public env var (SUPABASE_SERVICE_ROLE_KEY,
// not NEXT_PUBLIC_*), so it never ends up in the browser bundle. Only used for
// privileged operations the anon key can't do — currently: deleting an account.

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** True when the service key is set, so deletion can be offered in the UI. */
export const isAdminConfigured = Boolean(SUPABASE_URL && SERVICE_KEY);

export function createAdminClient() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
