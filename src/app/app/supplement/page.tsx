import type { Metadata } from "next";
import ComingSoon from "@/components/dashboard/coming-soon";

export const metadata: Metadata = { title: "Supplement — Upward" };

export default function SupplementPage() {
  return (
    <ComingSoon
      title="Supplement Tracking"
      icon="supplement"
      blurb="Build a stack, set reminders, and keep your adherence streak alive."
    />
  );
}
