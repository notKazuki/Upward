import { redirect } from "next/navigation";

// Logging now lives on Today (and behind the global capture / Ctrl-K), so the
// standalone Quick Log page just forwards there. smart-actions.ts in this
// folder is still the server action the capture components use.
export default function QuickLogPage() {
  redirect("/app");
}
