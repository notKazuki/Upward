import type { Metadata } from "next";
import DashboardCard from "@/components/dashboard/card";
import UnitSettings from "@/components/settings/unit-settings";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import type { UnitPref } from "@/lib/onboarding";

export const metadata: Metadata = { title: "Settings — Upward" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const user = await currentUser();
  const { data } = await supabase
    .from("profiles")
    .select("unit_pref")
    .eq("id", user!.id)
    .maybeSingle();
  const pref = (data?.unit_pref as UnitPref | null) ?? "metric";

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
    </div>
  );
}
