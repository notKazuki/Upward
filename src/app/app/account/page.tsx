import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardCard from "@/components/dashboard/card";
import UsernameForm from "@/components/account/username-form";
import DisplayNameForm from "@/components/account/display-name-form";
import AvatarUploader from "@/components/account/avatar-uploader";
import TwoFactor from "@/components/account/two-factor";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import { usernameUnlockDate } from "@/lib/username";

export const metadata: Metadata = { title: "Account — Upward" };

function initialsFrom(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "") || source[0] || "U")
    .toUpperCase();
}

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username, avatar_url, full_name")
    .eq("id", user.id)
    .maybeSingle();

  // Fetched separately so a missing column (migration not yet run) degrades
  // gracefully instead of breaking the page.
  const extra = await supabase
    .from("profiles")
    .select("display_name, username_changed_at")
    .eq("id", user.id)
    .maybeSingle();
  const displayName = (extra.data?.display_name as string | null) ?? null;
  const changedAt = (extra.data?.username_changed_at as string | null) ?? null;

  const username = (profile?.username as string | null) ?? null;
  const email = user.email ?? "";
  const fullName = (profile?.full_name as string | undefined) ?? "";
  const initials = initialsFrom(displayName || username || fullName, email);

  const unlockDate = usernameUnlockDate(changedAt);
  const unlockText = unlockDate
    ? `Locked until ${unlockDate.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })} — usernames can change once every 30 days.`
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="u-rise u-d1">
        <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">
          Account
        </h1>
        <p className="mt-1 text-sm text-muted">
          Manage your profile and security.
        </p>
      </div>

      {error ? (
        <DashboardCard title="One step left">
          <p className="text-sm leading-relaxed text-muted">
            Run <code className="text-ink">supabase/profile.sql</code> in
            Supabase → <b>SQL Editor</b>, then refresh this page.
          </p>
        </DashboardCard>
      ) : (
        <>
          <DashboardCard title="Profile photo">
            <AvatarUploader
              userId={user.id}
              currentUrl={(profile?.avatar_url as string | null) ?? null}
              initials={initials}
            />
          </DashboardCard>

          <DashboardCard title="Display name">
            <DisplayNameForm
              current={displayName}
              placeholder={username ?? "Your name"}
            />
          </DashboardCard>

          <DashboardCard title="Username">
            <UsernameForm
              current={username}
              locked={Boolean(unlockDate)}
              unlockText={unlockText}
            />
          </DashboardCard>

          <DashboardCard title="Two-factor authentication">
            <TwoFactor />
          </DashboardCard>

          <DashboardCard title="Email">
            <p className="text-sm text-ink-soft">{email}</p>
            <p className="mt-1 text-xs text-faint">
              Your sign-in email can&rsquo;t be changed here yet.
            </p>
          </DashboardCard>
        </>
      )}
    </div>
  );
}
