import { redirect } from "next/navigation";

// The RPG achievements/progress surface was retired in the calm-tracker
// restructure. Milestones now live on the You page.
export default function ProgressPage() {
  redirect("/app/stats");
}
