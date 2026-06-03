"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import {
  currentValue,
  type Goal,
  type GoalLog,
  type GoalStatus,
  type GoalType,
} from "@/lib/goals";

const TYPES: GoalType[] = ["binary", "numeric", "streak"];
const STATUSES: GoalStatus[] = ["active", "completed", "paused", "abandoned"];
const CATEGORY_IDS = ["fitness", "health", "finance", "career", "learning", "habits", "other"];

type Result = { ok?: boolean; error?: string };

function num(v: unknown): number | null {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : null;
}
function str(v: unknown, max: number): string | null {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
}

export async function createGoal(input: {
  title: string;
  type: string;
  category: string;
  target_value?: number | null;
  unit?: string | null;
  deadline?: string | null;
  why?: string | null;
  description?: string | null;
}): Promise<Result> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return { error: "Session expired." };

  const title = str(input.title, 120);
  if (!title) return { error: "Give your goal a title." };
  const type = input.type as GoalType;
  if (!TYPES.includes(type)) return { error: "Pick a goal type." };

  const category = CATEGORY_IDS.includes(input.category) ? input.category : "other";
  const target_value = type === "binary" ? null : num(input.target_value);
  if ((type === "numeric" || type === "streak") && !target_value) {
    return { error: "Set a target greater than zero." };
  }

  const { error } = await supabase.from("goals").insert({
    user_id: user.id,
    title,
    type,
    category,
    target_value,
    unit: type === "streak" ? "days" : str(input.unit, 24),
    deadline: input.deadline || null,
    why: str(input.why, 500),
    description: str(input.description, 500),
  });
  if (error) {
    return { error: "Couldn't save. Make sure you've run supabase/goals.sql." };
  }
  revalidatePath("/app/goals");
  revalidatePath("/app");
  return { ok: true };
}

export async function updateGoal(
  id: string,
  patch: {
    title?: string;
    category?: string;
    target_value?: number | null;
    unit?: string | null;
    deadline?: string | null;
    why?: string | null;
    description?: string | null;
  },
): Promise<Result> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return { error: "Session expired." };
  if (!id) return { error: "Missing goal." };

  const fields: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    const t = str(patch.title, 120);
    if (!t) return { error: "Title can't be empty." };
    fields.title = t;
  }
  if (patch.category !== undefined)
    fields.category = CATEGORY_IDS.includes(patch.category) ? patch.category : "other";
  if (patch.target_value !== undefined) fields.target_value = num(patch.target_value);
  if (patch.unit !== undefined) fields.unit = str(patch.unit, 24);
  if (patch.deadline !== undefined) fields.deadline = patch.deadline || null;
  if (patch.why !== undefined) fields.why = str(patch.why, 500);
  if (patch.description !== undefined) fields.description = str(patch.description, 500);

  const { error } = await supabase
    .from("goals")
    .update(fields)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "Couldn't save changes." };
  revalidatePath("/app/goals");
  return { ok: true };
}

export async function setGoalStatus(id: string, status: string): Promise<Result> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return { error: "Session expired." };
  if (!STATUSES.includes(status as GoalStatus)) return { error: "Bad status." };

  const { error } = await supabase
    .from("goals")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "Couldn't update status." };
  revalidatePath("/app/goals");
  revalidatePath("/app");
  return { ok: true };
}

export async function deleteGoal(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("goals").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/app/goals");
  revalidatePath("/app");
}

export async function logProgress(input: {
  goalId: string;
  date: string;
  value?: number | null;
  note?: string | null;
}): Promise<Result & { completed?: boolean }> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return { error: "Session expired." };
  if (!input.goalId) return { error: "Missing goal." };
  if (!input.date) return { error: "Pick a date." };

  const { data: goal, error: gErr } = await supabase
    .from("goals")
    .select("*")
    .eq("id", input.goalId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (gErr || !goal) return { error: "Goal not found." };
  const g = goal as Goal;

  const value =
    g.type === "numeric" ? num(input.value) : g.type === "streak" ? 1 : null;
  if (g.type === "numeric" && !value) {
    return { error: "Enter how much you did." };
  }

  const { error } = await supabase.from("goal_logs").insert({
    goal_id: g.id,
    user_id: user.id,
    logged_on: input.date,
    value,
    note: str(input.note, 280),
  });
  if (error) return { error: "Couldn't save your check-in." };

  // Auto-complete + celebrate when the target is met.
  let completed = false;
  if (g.status === "active" && (g.type === "numeric" || g.type === "streak")) {
    const { data: logs } = await supabase
      .from("goal_logs")
      .select("*")
      .eq("goal_id", g.id);
    const reached =
      (g.target_value ?? 0) > 0 &&
      currentValue(g, (logs ?? []) as GoalLog[]) >= (g.target_value ?? 0);
    if (reached) {
      await supabase.from("goals").update({ status: "completed" }).eq("id", g.id);
      completed = true;
    }
  }

  revalidatePath("/app/goals");
  revalidatePath("/app");
  return { ok: true, completed };
}

export async function deleteLog(id: string): Promise<void> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return;
  if (!id) return;
  await supabase.from("goal_logs").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/app/goals");
  revalidatePath("/app");
}
