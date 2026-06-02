import type { Metadata } from "next";
import AuthShell from "@/components/auth-shell";
import AuthForm from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Create your account — Upward",
};

export default function SignUpPage() {
  return (
    <AuthShell eyebrow="Begin" title="Create your space">
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
