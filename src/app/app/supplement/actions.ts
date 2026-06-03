"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import type { Timing } from "@/lib/supplements";

const TIMINGS: Timing[] = ["morning", "preworkout", "evening", "anytime"];
type Result = { ok?: boolean; error?: string };

function clean(v: unknown, max: number): string | null {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
}

export async function addSupplement(input: {
  name: string;
  dose?: string | null;
  timing: string;
}): Promise<Result> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return { error: "Session expired." };

  const name = clean(input.name, 80);
  if (!name) return { error: "Name your supplement." };
  const timing = TIMINGS.includes(input.timing as Timing)
    ? (input.timing as Timing)
    : "anytime";

  const { error } = await supabase.from("supplements").insert({
    user_id: user.id,
    name,
    dose: clean(input.dose, 40),
    timing,
  });
  if (error) {
    return { error: "Couldn't save. Make sure you've run supabase/supplements.sql." };
  }
  revalidatePath("/app/supplement");
  return { ok: true };
}

export async function updateSupplement(
  id: string,
  patch: { name?: string; dose?: string | null; timing?: string },
): Promise<Result> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return { error: "Session expired." };
  if (!id) return { error: "Missing supplement." };

  const fields: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const n = clean(patch.name, 80);
    if (!n) return { error: "Name can't be empty." };
    fields.name = n;
  }
  if (patch.dose !== undefined) fields.dose = clean(patch.dose, 40);
  if (patch.timing !== undefined)
    fields.timing = TIMINGS.includes(patch.timing as Timing) ? patch.timing : "anytime";

  const { error } = await supabase
    .from("supplements")
    .update(fields)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "Couldn't save changes." };
  revalidatePath("/app/supplement");
  return { ok: true };
}

export async function deleteSupplement(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("supplements").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/app/supplement");
}

/** Toggle whether a supplement was taken on a given day. */
export async function toggleTaken(
  supplementId: string,
  date: string,
): Promise<Result> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return { error: "Session expired." };
  if (!supplementId || !date) return { error: "Missing data." };

  const { data: existing } = await supabase
    .from("supplement_logs")
    .select("id")
    .eq("supplement_id", supplementId)
    .eq("taken_on", date)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("supplement_logs").delete().eq("id", existing.id);
  } else {
    const { error } = await supabase.from("supplement_logs").insert({
      user_id: user.id,
      supplement_id: supplementId,
      taken_on: date,
    });
    if (error) return { error: "Couldn't update." };
  }
  revalidatePath("/app/supplement");
  return { ok: true };
}
