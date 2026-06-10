"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveTimezone } from "@/app/app/push/actions";

/**
 * Writes the browser's IANA timezone to a `tz` cookie so server components can
 * compute "today" in the user's zone (see lib/server-today.ts), and persists it
 * to the profile so scheduled reminders fire in local time. Refreshes once if
 * the cookie was missing or changed. Renders nothing.
 */
export default function TimezoneCookie() {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;
    const current = document.cookie
      .split("; ")
      .find((c) => c.startsWith("tz="))
      ?.slice(3);
    if (decodeURIComponent(current ?? "") !== tz) {
      document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
      void saveTimezone(tz); // best-effort; column arrives with push.sql
      router.refresh();
    } else if (!localStorage.getItem("tz-saved")) {
      // Cookie already matched (set before the column existed) — persist once.
      void saveTimezone(tz).then(() => localStorage.setItem("tz-saved", tz));
    }
  }, [router]);
  return null;
}
