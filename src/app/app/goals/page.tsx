import type { Metadata } from "next";
import ComingSoon from "@/components/dashboard/coming-soon";

export const metadata: Metadata = { title: "Goals — Upward" };

export default function GoalsPage() {
  return (
    <ComingSoon
      title="Goals"
      icon="goals"
      blurb="Set goals, break them into steps, and check them off as you climb."
    />
  );
}
