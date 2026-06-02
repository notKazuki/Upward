import type { Metadata } from "next";
import AuthShell from "@/components/auth-shell";
import ResetPasswordForm from "@/components/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password — Upward",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell eyebrow="Almost there" title="Set a new password">
      <ResetPasswordForm />
    </AuthShell>
  );
}
