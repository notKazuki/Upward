import type { Metadata } from "next";
import ComingSoon from "@/components/dashboard/coming-soon";

export const metadata: Metadata = { title: "Meal — Upward" };

export default function MealPage() {
  return (
    <ComingSoon
      title="Meal Tracking"
      icon="meal"
      blurb="Track meals, calories, and macros with a calm, fast logging flow."
    />
  );
}
