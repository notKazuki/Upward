import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Atmosphere from "@/components/atmosphere";
import Logo from "@/components/logo";
import OnboardingWizard from "@/components/onboarding/wizard";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Welcome — Upward",
};

export default async function OnboardingPage() {
  if (!isSupabaseConfigured) redirect("/signin");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  // Already onboarded? Go straight to the app. (If the table is missing the
  // query errors — we let the user through and surface that on submit.)
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarded")
    .eq("id", user.id)
    .maybeSingle();
  if (!error && data?.onboarded) redirect("/app");

  const fullName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ?? "";
  const email = user.email ?? "";
  const firstName = fullName ? fullName.split(" ")[0] : email.split("@")[0];

  return (
    <>
      <Atmosphere />
      <div className="relative flex min-h-dvh flex-col px-5 sm:px-8">
        <header className="u-fade u-d1 mx-auto flex w-full max-w-6xl items-center py-6">
          <Logo />
        </header>

        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-10">
          <p className="u-fade u-d2 mb-2 text-center text-[0.7rem] font-medium uppercase tracking-[0.32em] text-faint">
            Welcome{firstName ? `, ${firstName}` : ""}
          </p>
          <div className="u-rise u-d3 rounded-2xl border border-line bg-card p-6 shadow-[0_18px_50px_-24px_rgba(34,31,26,0.35)] sm:p-8">
            <OnboardingWizard />
          </div>
        </main>
      </div>
    </>
  );
}
