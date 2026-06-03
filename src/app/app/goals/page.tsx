import type { Metadata } from "next";
import DashboardCard from "@/components/dashboard/card";
import GoalsBoard from "@/components/goals/goals-board";
import { createClient } from "@/lib/supabase/server";
import type { Goal, GoalLog } from "@/lib/goals";

export const metadata: Metadata = { title: "Goals — Upward" };

export default async function GoalsPage() {
  const supabase = await createClient();

  const [goalsRes, logsRes] = await Promise.all([
    supabase.from("goals").select("*").order("created_at", { ascending: false }),
    supabase
      .from("goal_logs")
      .select("*")
      .order("logged_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const tableMissing = Boolean(goalsRes.error);
  const goals = (goalsRes.data ?? []) as Goal[];
  const logs = (logsRes.data ?? []) as GoalLog[];

  const logsByGoal: Record<string, GoalLog[]> = {};
  for (const l of logs) (logsByGoal[l.goal_id] ??= []).push(l);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">
          Goals
        </h1>
        <p className="mt-1 text-sm text-muted">
          Set what matters, track the journey, and handle the rough weeks
          gracefully — pause or adjust instead of giving up.
        </p>
      </div>

      {tableMissing ? (
        <DashboardCard title="One step left">
          <p className="text-sm leading-relaxed text-muted">
            Run <code className="text-ink">supabase/goals.sql</code> in Supabase
            → <b>SQL Editor</b>, then refresh this page.
          </p>
        </DashboardCard>
      ) : (
        <GoalsBoard goals={goals} logsByGoal={logsByGoal} />
      )}
    </div>
  );
}
