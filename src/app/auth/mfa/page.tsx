import type { Metadata } from "next";
import AuthShell from "@/components/auth-shell";
import MfaChallenge from "@/components/mfa-challenge";

export const metadata: Metadata = { title: "Security check — Upward" };

export default function MfaPage() {
  return (
    <AuthShell eyebrow="Security check" title="Two-factor">
      <MfaChallenge />
    </AuthShell>
  );
}
