import { cache } from "react";
import { createClient } from "./supabase/server";

/**
 * The signed-in user, memoized per request so the layout and page don't each
 * make a separate auth round-trip.
 */
export const currentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
