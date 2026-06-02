import type { Metadata } from "next";
import ComingSoon from "@/components/dashboard/coming-soon";

export const metadata: Metadata = { title: "Calendar — Upward" };

export default function CalendarPage() {
  return (
    <ComingSoon
      title="Calendar"
      icon="calendar"
      blurb="A full view of your activity over time, with day-by-day detail."
    />
  );
}
