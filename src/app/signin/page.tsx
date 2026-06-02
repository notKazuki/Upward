import type { Metadata } from "next";
import AuthShell from "@/components/auth-shell";
import AuthForm from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Sign in — Upward",
};

export default function SignInPage() {
  return (
    <AuthShell eyebrow="Welcome back" title="Continue your climb">
      <AuthForm mode="signin" />
    </AuthShell>
  );
}
