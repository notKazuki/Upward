"use client";

import { useEffect, useState } from "react";
import { ymdLocal } from "@/lib/today";

/**
 * The user's local "today" (YYYY-MM-DD), set after mount to avoid a hydration
 * mismatch — the server renders in UTC, the client in the user's zone. Returns
 * "" for the very first paint, then the correct local date.
 */
export function useToday(): string {
  const [today, setToday] = useState("");
  useEffect(() => setToday(ymdLocal()), []);
  return today;
}
