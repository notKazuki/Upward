"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentUser } from "@/lib/auth";
import type { EventType } from "@/lib/calendar";

const VALID: EventType[] = ["workout", "meal", "gaming", "goal", "other"];

export async function addEvent(input: {
  date: string;
  time: string | null;
  type: string;
  title: string;
  notes: string | null;
}): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user) return { error: "Your session expired. Please sign in again." };

  const title = input.title?.trim();
  if (!title) return { error: "Give your plan a title." };
  if (!input.date) return { error: "Pick a date." };
  const type = (VALID as string[]).includes(input.type)
    ? (input.type as EventType)
    : "other";
  const time = input.time && /^\d{2}:\d{2}/.test(input.time) ? input.time : null;

  const { error } = await supabase.from("calendar_events").insert({
    user_id: user.id,
    date: input.date,
    time,
    type,
    title,
    notes: input.notes?.trim() || null,
  });

  if (error) {
    return {
      error: "Couldn't save. Make sure you've run supabase/calendar.sql.",
    };
  }

  revalidatePath("/app/calendar");
  return { ok: true };
}

export async function toggleEvent(id: string, done: boolean): Promise<void> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user || !id) return;
  await supabase
    .from("calendar_events")
    .update({ done })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/app/calendar");
}

export async function deleteEvent(id: string): Promise<void> {
  const supabase = await createClient();
  const user = await currentUser();
  if (!user || !id) return;
  await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/app/calendar");
}
