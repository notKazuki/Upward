import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import DashboardShell from "@/components/dashboard/shell";
import TimezoneCookie from "@/components/tz-cookie";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { asExperience } from "@/lib/experience";

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

  // Display name + admin flag are fetched separately (and in parallel) so a
  // missing column from a not-yet-run migration doesn't break the layout.
  const [dn, adminRes, proRes, expRes] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(),
    supabase.from("profiles").select("is_pro").eq("id", user.id).maybeSingle(),
    supabase.from("profiles").select("experience").eq("id", user.id).maybeSingle(),
  ]);
  const displayName = ((dn.data?.display_name as string | null) ?? "").trim();
  const isAdmin = !adminRes.error && Boolean(adminRes.data?.is_admin);
  const isPro = !proRes.error && Boolean(proRes.data?.is_pro);
  const experience = asExperience(expRes.error ? null : expRes.data?.experience);

  // Prefer the display name, then the username, then first name / email.
  const name =
    displayName ||
    username ||
    (fullName ? fullName.split(" ")[0] : email.split("@")[0]);

  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get("sidebar")?.value === "collapsed";

  return (
    <>
      <TimezoneCookie />
      <DashboardShell
        initialCollapsed={initialCollapsed}
        isPro={isPro}
        experience={experience}
        user={{
          name,
          email,
          initials: initialsFrom(displayName || username || fullName, email),
          avatarUrl: (profile?.avatar_url as string | null) ?? null,
          username: username || null,
          isAdmin,
        }}
      >
        {children}
      </DashboardShell>
    </>
  );
}
