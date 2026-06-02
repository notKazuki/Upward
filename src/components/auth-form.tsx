"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Mode = "signin" | "signup";
type Provider = "google" | "discord";

const copy = {
  signin: {
    submit: "Sign in",
    pending: "Signing in…",
    altText: "New to Upward?",
    altLink: "Create an account",
    altHref: "/signup",
  },
  signup: {
    submit: "Create account",
    pending: "Creating…",
    altText: "Already have an account?",
    altLink: "Sign in",
    altHref: "/signin",
  },
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = Partial<Record<"name" | "email" | "password", string>>;

function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "That email or password doesn't match. Try again.";
  if (m.includes("email not confirmed"))
    return "Please confirm your email first — check your inbox.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "An account with this email already exists. Try signing in.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Please wait a moment and try again.";
  if (m.includes("provider is not enabled") || m.includes("not enabled"))
    return "That sign-in method isn't enabled yet.";
  if (m.includes("password")) return message;
  return message || "Something went wrong. Please try again.";
}

export default function AuthForm({
  mode,
  onSwitchMode,
}: {
  mode: Mode;
  onSwitchMode?: (next: Mode) => void;
}) {
  const t = copy[mode];
  const isSignup = mode === "signup";
  const altMode: Mode = isSignup ? "signin" : "signup";
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "pending" | "sent" | "stubbed"
  >("idle");
  const [oauthPending, setOauthPending] = useState<Provider | null>(null);

  // Password-reset sub-view (only reachable from sign in).
  const [view, setView] = useState<"form" | "reset">("form");
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState<"idle" | "pending" | "sent">(
    "idle",
  );
  const [resetError, setResetError] = useState<string | null>(null);

  function validate(): Errors {
    const next: Errors = {};
    if (isSignup && name.trim().length < 2)
      next.name = "Please tell us what to call you.";
    if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";
    if (isSignup) {
      if (password.length < 8) next.password = "Use at least 8 characters.";
    } else if (password.length === 0) {
      next.password = "Enter your password.";
    }
    return next;
  }

  async function handleOAuth(provider: Provider) {
    setFormError(null);
    if (!isSupabaseConfigured) {
      setStatus("stubbed");
      return;
    }
    setOauthPending(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/app`,
      },
    });
    // On success the browser is redirected to the provider.
    if (error) {
      setFormError(friendlyError(error.message));
      setOauthPending(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    if (!isSupabaseConfigured) {
      setStatus("stubbed");
      return;
    }

    setStatus("pending");
    const supabase = createClient();

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/app`,
          data: { full_name: name.trim() },
        },
      });
      if (error) {
        setFormError(friendlyError(error.message));
        setStatus("idle");
        return;
      }
      setStatus("sent");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setFormError(friendlyError(error.message));
      setStatus("idle");
      return;
    }

    const next =
      new URLSearchParams(window.location.search).get("next") || "/app";
    router.push(next);
    router.refresh();
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    if (!EMAIL_RE.test(resetEmail)) {
      setResetError("Enter a valid email address.");
      return;
    }
    if (!isSupabaseConfigured) {
      setResetStatus("sent");
      return;
    }
    setResetStatus("pending");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    if (error) {
      setResetError(friendlyError(error.message));
      setResetStatus("idle");
      return;
    }
    setResetStatus("sent");
  }

  /* ----- Password reset view ----- */
  if (view === "reset") {
    if (resetStatus === "sent") {
      return (
        <Notice
          title="Check your inbox"
          body={
            <>
              If an account exists for{" "}
              <span className="font-medium text-ink-soft">{resetEmail}</span>,
              a password reset link is on its way.
            </>
          }
          onBack={() => {
            setView("form");
            setResetStatus("idle");
          }}
        />
      );
    }
    return (
      <form noValidate onSubmit={handleReset} className="flex flex-col gap-5">
        <p className="text-sm leading-relaxed text-muted">
          Enter your email and we&rsquo;ll send you a link to set a new password.
        </p>
        <Field
          id="reset-email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={resetEmail}
          error={resetError ?? undefined}
          onChange={(v) => {
            setResetEmail(v);
            if (resetError) setResetError(null);
          }}
        />
        <SubmitButton pending={resetStatus === "pending"} label="Send reset link" pendingLabel="Sending…" />
        <button
          type="button"
          onClick={() => setView("form")}
          className="cursor-pointer text-center text-sm font-medium text-ink underline decoration-line-strong underline-offset-2 transition-colors hover:text-ember hover:decoration-ember"
        >
          Back to sign in
        </button>
      </form>
    );
  }

  /* ----- Sign-up success ----- */
  if (status === "sent") {
    return (
      <Notice
        title="Check your inbox"
        body={
          <>
            We sent a confirmation link to{" "}
            <span className="font-medium text-ink-soft">{email}</span>. Click it
            to activate your account and start your climb.
          </>
        }
        onBack={onSwitchMode ? () => onSwitchMode("signin") : undefined}
        backHref={onSwitchMode ? undefined : "/signin"}
      />
    );
  }

  /* ----- Main form ----- */
  return (
    <form noValidate onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-2.5">
        <ProviderButton
          label={isSignup ? "Sign up with Google" : "Continue with Google"}
          icon={<GoogleIcon />}
          pending={oauthPending === "google"}
          disabled={oauthPending !== null}
          onClick={() => handleOAuth("google")}
        />
        <ProviderButton
          label={isSignup ? "Sign up with Discord" : "Continue with Discord"}
          icon={<DiscordIcon />}
          pending={oauthPending === "discord"}
          disabled={oauthPending !== null}
          onClick={() => handleOAuth("discord")}
        />
      </div>

      <div className="flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-faint">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      {isSignup && (
        <Field
          id="name"
          label="Name"
          type="text"
          autoComplete="name"
          placeholder="What should we call you?"
          value={name}
          error={errors.name}
          onChange={(v) => {
            setName(v);
            if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
          }}
        />
      )}

      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        error={errors.email}
        onChange={(v) => {
          setEmail(v);
          if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
        }}
      />

      <Field
        id="password"
        label="Password"
        type={showPassword ? "text" : "password"}
        autoComplete={isSignup ? "new-password" : "current-password"}
        placeholder={isSignup ? "At least 8 characters" : "Your password"}
        value={password}
        error={errors.password}
        onChange={(v) => {
          setPassword(v);
          if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
        }}
        trailing={
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="cursor-pointer text-xs font-medium text-muted transition-colors hover:text-ink"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        }
      />

      {!isSignup && (
        <div className="-mt-1 text-right">
          <button
            type="button"
            onClick={() => {
              setResetEmail(email);
              setView("reset");
            }}
            className="cursor-pointer text-xs font-medium text-muted underline decoration-line-strong underline-offset-2 transition-colors hover:text-ember"
          >
            Forgot password?
          </button>
        </div>
      )}

      {formError && (
        <p
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-3 text-center text-sm text-danger"
        >
          {formError}
        </p>
      )}

      <SubmitButton pending={status === "pending"} label={t.submit} pendingLabel={t.pending} />

      {status === "stubbed" && (
        <p
          role="status"
          className="rounded-xl border border-ember-soft/40 bg-ember-wash/50 px-4 py-3 text-center text-sm text-ink-soft"
        >
          Looking good. Add your Supabase keys to <code>.env.local</code> to make
          accounts go live.
        </p>
      )}

      <p className="text-center text-sm text-muted">
        {t.altText}{" "}
        {onSwitchMode ? (
          <button
            type="button"
            onClick={() => onSwitchMode(altMode)}
            className="cursor-pointer font-medium text-ink underline decoration-line-strong underline-offset-2 transition-colors hover:text-ember hover:decoration-ember"
          >
            {t.altLink}
          </button>
        ) : (
          <Link
            href={t.altHref}
            className="font-medium text-ink underline decoration-line-strong underline-offset-2 transition-colors hover:text-ember hover:decoration-ember"
          >
            {t.altLink}
          </Link>
        )}
      </p>
    </form>
  );
}

/* ------------------------------------------------------------------ */

function SubmitButton({
  pending,
  label,
  pendingLabel,
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3.5 text-sm font-medium text-paper-bright shadow-[0_2px_8px_rgba(34,31,26,0.16)] transition-all duration-200 hover:bg-ink-soft hover:shadow-[0_8px_22px_rgba(34,31,26,0.2)] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? (
        <>
          <Spinner />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}

function ProviderButton({
  label,
  icon,
  pending,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  pending: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-line bg-paper-bright px-4 py-3 text-sm font-medium text-ink transition-colors duration-200 hover:border-line-strong hover:bg-card disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? <Spinner /> : icon}
      {label}
    </button>
  );
}

function Notice({
  title,
  body,
  onBack,
  backHref,
}: {
  title: string;
  body: React.ReactNode;
  onBack?: () => void;
  backHref?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-ember-wash text-ember">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M4 6h16v12H4z" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      </span>
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      <p className="max-w-xs text-sm leading-relaxed text-muted">{body}</p>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mt-2 cursor-pointer text-sm font-medium text-ink underline decoration-line-strong underline-offset-2 transition-colors hover:text-ember hover:decoration-ember"
        >
          Back to sign in
        </button>
      ) : backHref ? (
        <Link
          href={backHref}
          className="mt-2 text-sm font-medium text-ink underline decoration-line-strong underline-offset-2 transition-colors hover:text-ember hover:decoration-ember"
        >
          Back to sign in
        </Link>
      ) : null}
    </div>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
  trailing,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-ink-soft">
          {label}
        </label>
        {trailing}
      </div>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full rounded-xl border bg-paper-bright px-4 py-3 text-[0.95rem] text-ink placeholder:text-faint transition-colors duration-200 focus:outline-none focus-visible:outline-none ${
          error
            ? "border-danger/60 focus:border-danger"
            : "border-line focus:border-ember"
        }`}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2" aria-hidden>
      <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.056c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.331c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}
