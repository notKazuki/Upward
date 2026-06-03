import type { Metadata } from "next";
import DashboardCard from "@/components/dashboard/card";
import SupplementBoard from "@/components/supplement/supplement-board";
import { createClient } from "@/lib/supabase/server";
import { serverToday } from "@/lib/server-today";
import { daysEnding } from "@/lib/today";
import type { Supplement, SupplementLog } from "@/lib/supplements";

export const metadata: Metadata = { title: "Supplement — Upward" };

export default async function SupplementPage() {
  const supabase = await createClient();
  const days = daysEnding(await serverToday(), 7);
  const since = days[0];

  const [suppRes, logRes] = await Promise.all([
    supabase
      .from("supplements")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("supplement_logs")
      .select("supplement_id, taken_on, id")
      .gte("taken_on", since),
  ]);

  const tableMissing = Boolean(suppRes.error);
  const supplements = (suppRes.data ?? []) as Supplement[];
  const logs = (logRes.data ?? []) as SupplementLog[];

  const takenBySupplement: Record<string, string[]> = {};
  for (const l of logs) (takenBySupplement[l.supplement_id] ??= []).push(l.taken_on);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">
          Supplement
        </h1>
        <p className="mt-1 text-sm text-muted">
          Build your daily stack and tick each one off as you take it.
        </p>
      </div>

      {tableMissing ? (
        <DashboardCard title="One step left">
          <p className="text-sm leading-relaxed text-muted">
            Run <code className="text-ink">supabase/supplements.sql</code> in
            Supabase → <b>SQL Editor</b>, then refresh this page.
          </p>
        </DashboardCard>
      ) : (
        <SupplementBoard
          supplements={supplements}
          takenBySupplement={takenBySupplement}
          days={days}
        />
      )}
    </div>
  );
}
