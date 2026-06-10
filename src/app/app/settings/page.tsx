import type { Metadata } from "next";
import Link from "next/link";
import DashboardCard from "@/components/dashboard/card";
import UnitSettings from "@/components/settings/unit-settings";
import PushSettings from "@/components/settings/push-settings";
import PrivacySettings from "@/components/social/privacy-settings";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import type { UnitPref } from "@/lib/onboarding";
import type { PrivacyMap } from "@/lib/social";

export const metadata: Metadata = { title: "Settings — Upward" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const user = await currentUser();
  const { data } = await supabase
    .from("profiles")
    .select("unit_pref, username")
    .eq("id", user!.id)
    .maybeSingle();
  const pref = (data?.unit_pref as UnitPref | null) ?? "metric";
  const username = (data?.username as string | null) ?? null;

  // Social columns live in a separate (newer) migration — query them
  // tolerantly so the page still works before supabase/social.sql is applied.
  const { data: soc, error: socErr } = await supabase
    .from("profiles")
    .select("bio, privacy")
    .eq("id", user!.id)
    .maybeSingle();
  const socialReady = !socErr;
  const bio = (soc?.bio as string | null) ?? "";
  const privacy = (soc?.privacy as PrivacyMap | null) ?? {};

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted">
          Preferences for how Upward shows things.
        </p>
      </div>

      <DashboardCard title="Units">
        <UnitSettings current={pref} />
      </DashboardCard>

      <DashboardCard title="Notifications">
        <PushSettings vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
      </DashboardCard>

      <DashboardCard
        title="Profile sharing"
        action={
          username ? (
            <Link
              href={`/app/u/${username}`}
              className="text-xs font-medium text-muted transition-colors hover:text-ember"
            >
              View my profile
            </Link>
          ) : undefined
        }
      >
        {socialReady ? (
          <PrivacySettings bio={bio} privacy={privacy} hasUsername={Boolean(username)} />
        ) : (
          <p className="text-sm leading-relaxed text-muted">
            Run <code className="text-ink">supabase/social.sql</code> in Supabase →{" "}
            <b>SQL Editor</b> to enable profile sharing and friends.
          </p>
        )}
      </DashboardCard>
    </div>
  );
}
