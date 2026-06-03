"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Writes the browser's IANA timezone to a `tz` cookie so server components can
 * compute "today" in the user's zone (see lib/server-today.ts). Refreshes once
 * if the cookie was missing or changed, so the current page re-renders with the
 * correct day. Renders nothing.
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
      router.refresh();
    }
  }, [router]);
  return null;
}
