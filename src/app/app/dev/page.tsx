import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardCard from "@/components/dashboard/card";
import DevPanelClient from "@/components/dev/dev-panel-client";
import {
  getDevStats,
  isCurrentUserAdmin,
  listAllUsers,
} from "./actions";

export const metadata: Metadata = { title: "Dev — Upward" };

export default async function DevPage() {
  const admin = await isCurrentUserAdmin();
  if (!admin) redirect("/app");

  const [stats, users] = await Promise.all([getDevStats(), listAllUsers()]);

  const statCards = stats
    ? [
        { label: "Users", value: stats.users },
        { label: "Workouts", value: stats.workouts },
        { label: "Meals", value: stats.meals },
        { label: "Game sessions", value: stats.gameSessions },
        { label: "Journal entries", value: stats.journalEntries },
        { label: "Goals", value: stats.goals },
        { label: "Messages", value: stats.messages },
        { label: "Badges earned", value: stats.achievementsEarned },
      ]
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="font-display text-[2rem] font-normal tracking-tight text-ink">
          Dev panel
        </h1>
        <p className="mt-1 text-sm text-muted">
          Admin-only — app-wide stats, members, and announcements.
        </p>
      </div>

      {stats === null ? (
        <DashboardCard title="One step left">
          <p className="text-sm leading-relaxed text-muted">
            Run <code className="text-ink">supabase/admin.sql</code> and make sure{" "}
            <code className="text-ink">SUPABASE_SERVICE_ROLE_KEY</code> is set, then refresh.
          </p>
        </DashboardCard>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {statCards.map((s) => (
              <div key={s.label} className="rounded-2xl border border-line bg-card p-4">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">
                  {s.label}
                </span>
                <p className="mt-2 font-display text-2xl text-ink">{s.value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <DevPanelClient users={users} />
        </>
      )}
    </div>
  );
}
