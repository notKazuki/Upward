import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import DashboardShell from "@/components/dashboard/shell";
import TimezoneCookie from "@/components/tz-cookie";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";

function initialsFrom(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return (letters || source[0] || "U").toUpperCase();
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured) redirect("/signin");

  const user = await currentUser();
  if (!user) redirect("/signin");
  const supabase = await createClient();

  // 2FA gate: if the account has a verified factor but the session is still
  // AAL1, require the TOTP challenge before anything in the app loads.
  let needsMfa = false;
  try {
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    needsMfa =
      !!aal && aal.currentLevel === "aal1" && aal.nextLevel === "aal2";
  } catch {
    needsMfa = false;
  }
  if (needsMfa) redirect("/auth/mfa");

  // Gate on onboarding. If the profiles table isn't set up yet the query errors
  // — in that case we let the user through so the app keeps working.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("onboarded, avatar_url, username")
    .eq("id", user.id)
    .maybeSingle();
  if (!profileError && !profile?.onboarded) redirect("/onboarding");

  const fullName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ?? "";
  const email = user.email ?? "";
  const username = (profile?.username as string | undefined) ?? "";
  // Prefer the chosen username as the display name; fall back to first name.
  const name =
    username || (fullName ? fullName.split(" ")[0] : email.split("@")[0]);

  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get("sidebar")?.value === "collapsed";

  return (
    <>
      <TimezoneCookie />
      <DashboardShell
        initialCollapsed={initialCollapsed}
        user={{
          name,
          email,
          initials: initialsFrom(username || fullName, email),
          avatarUrl: (profile?.avatar_url as string | null) ?? null,
        }}
      >
        {children}
      </DashboardShell>
    </>
  );
}
