"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  USE_CASES,
  ageFromDob,
  ftInToCm,
  lbToKg,
  MIN_AGE,
  type Gender,
  type UnitPref,
} from "@/lib/onboarding";
import { completeOnboarding } from "@/app/onboarding/actions";
import { EXPERIENCES, type Experience } from "@/lib/experience";
import DateField from "@/components/date-field";

const STEPS = [
  { title: "When were you born?", subtitle: `Upward is for ages ${MIN_AGE} and up.` },
  { title: "How do you identify?", subtitle: "This tailors some of your feedback." },
  { title: "Your measurements", subtitle: "Optional — handy for fitness tracking." },
  { title: "What brings you to Upward?", subtitle: "Pick all that apply." },
  { title: "How should Upward feel?", subtitle: "Choose your experience — you can switch anytime in Settings." },
];

const GENDERS: { id: Gender; label: string; note?: string }[] = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  {
    id: "unspecified",
    label: "Rather not say",
    note: "Some feedback (like calorie targets) is tuned by sex — yours will stay general.",
  },
];

const TODAY = new Date().toISOString().slice(0, 10);

export default function OnboardingWizard({
  firstName,
}: {
  firstName: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [tooYoung, setTooYoung] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [unit, setUnit] = useState<UnitPref>("metric");
  const [cm, setCm] = useState("");
  const [kg, setKg] = useState("");
  const [ft, setFt] = useState("");
  const [inch, setInch] = useState("");
  const [lb, setLb] = useState("");
  const [uses, setUses] = useState<string[]>([]);
  const [experience, setExperience] = useState<Experience | "">("");

  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  function next() {
    setError(null);
    if (step === 0) {
      if (!dob) return setError("Please enter your date of birth.");
      if (ageFromDob(dob) < MIN_AGE) {
        setTooYoung(true);
        return;
      }
    }
    if (step === 1 && !gender) return setError("Please choose an option.");
    if (step === 3 && uses.length === 0)
      return setError("Pick at least one thing to track.");
    if (isLast) return finish();
    setStep((s) => s + 1);
  }

  function toggleUse(id: string) {
    setUses((u) => (u.includes(id) ? u.filter((x) => x !== id) : [...u, id]));
  }

  async function finish() {
    if (uses.length === 0) return setError("Pick at least one thing to track.");
    if (!experience) return setError("Pick how you'd like to use Upward.");

    let heightCm: number | null = null;
    let weightKg: number | null = null;
    if (unit === "metric") {
      if (cm) heightCm = Number(cm);
      if (kg) weightKg = Number(kg);
    } else {
      if (ft || inch) heightCm = ftInToCm(Number(ft || 0), Number(inch || 0));
      if (lb) weightKg = lbToKg(Number(lb));
    }

    setSubmitting(true);
    const res = await completeOnboarding({
      dob,
      gender: gender as Gender,
      heightCm,
      weightKg,
      unitPref: unit,
      uses,
      experience,
    });
    // On success the server action redirects to /app; we only reach here on error.
    if (res?.error) {
      setError(res.error);
      setSubmitting(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (tooYoung) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <h2 className="font-display text-2xl text-ink">
          Come back in a little while
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-muted">
          Upward is for ages {MIN_AGE} and up. Thanks for your interest — we
          hope to see you when you&rsquo;re a bit older.
        </p>
        <button
          type="button"
          onClick={signOut}
          className="mt-2 cursor-pointer rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft"
        >
          Sign out
        </button>
      </div>
    );
  }

  const meta = STEPS[step];

  return (
    <div>
      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-faint">
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
        >
          <div
            className="h-full rounded-full bg-ember transition-[width] duration-400 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <h1 className="font-display text-[1.75rem] font-normal leading-tight tracking-tight text-ink">
        {meta.title}
      </h1>
      <p className="mt-1.5 text-sm text-muted">{meta.subtitle}</p>

      <div className="mt-6">
        {/* Step 0 — DOB */}
        {step === 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink-soft">
              Date of birth
            </span>
            <DateField
              value={dob}
              onChange={(v) => {
                setDob(v);
                setError(null);
              }}
              max={TODAY}
              placeholder="Select your date of birth"
            />
            {dob && ageFromDob(dob) >= MIN_AGE && (
              <p className="text-xs text-muted">
                You&rsquo;re {ageFromDob(dob)}.
              </p>
            )}
          </div>
        )}

        {/* Step 1 — Gender */}
        {step === 1 && (
          <div className="flex flex-col gap-2.5">
            {GENDERS.map((g) => {
              const active = gender === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setGender(g.id);
                    setError(null);
                  }}
                  aria-pressed={active}
                  className={`cursor-pointer rounded-xl border px-4 py-3 text-left transition-colors duration-200 ${
                    active
                      ? "border-ember bg-ember-wash"
                      : "border-line bg-paper-bright hover:border-line-strong"
                  }`}
                >
                  <span className="text-sm font-medium text-ink">{g.label}</span>
                  {g.note && (
                    <span className="mt-1 block text-xs leading-relaxed text-muted">
                      {g.note}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2 — Measurements */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div className="inline-flex self-start rounded-lg border border-line bg-paper-bright p-1 text-sm">
              {(["metric", "imperial"] as UnitPref[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`cursor-pointer rounded-md px-4 py-1.5 font-medium capitalize transition-colors ${
                    unit === u
                      ? "bg-ink text-paper-bright"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>

            {unit === "metric" ? (
              <div className="grid grid-cols-2 gap-4">
                <NumberField id="cm" label="Height (cm)" value={cm} onChange={setCm} placeholder="175" />
                <NumberField id="kg" label="Weight (kg)" value={kg} onChange={setKg} placeholder="70" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <NumberField id="ft" label="Height (ft)" value={ft} onChange={setFt} placeholder="5" />
                <NumberField id="in" label="(in)" value={inch} onChange={setInch} placeholder="9" />
                <NumberField id="lb" label="Weight (lb)" value={lb} onChange={setLb} placeholder="154" />
              </div>
            )}
            <p className="text-xs text-muted">
              Numbers stay private and you can change them anytime.
            </p>
          </div>
        )}

        {/* Step 3 — Use cases */}
        {step === 3 && (
          <div className="flex flex-wrap gap-2">
            {USE_CASES.map((uc) => {
              const active = uses.includes(uc.id);
              return (
                <button
                  key={uc.id}
                  type="button"
                  onClick={() => {
                    toggleUse(uc.id);
                    setError(null);
                  }}
                  aria-pressed={active}
                  title={uc.hint}
                  className={`cursor-pointer rounded-full border px-3.5 py-2 text-sm font-medium transition-colors duration-200 ${
                    active
                      ? "border-ember bg-ember text-paper-bright"
                      : "border-line bg-paper-bright text-ink-soft hover:border-line-strong"
                  }`}
                >
                  {uc.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Step 4 — Experience */}
        {step === 4 && (
          <div className="flex flex-col gap-3">
            {EXPERIENCES.map((ex) => {
              const active = experience === ex.id;
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => {
                    setExperience(ex.id);
                    setError(null);
                  }}
                  aria-pressed={active}
                  className={`cursor-pointer rounded-2xl border p-4 text-left transition-colors duration-200 ${
                    active
                      ? "border-ember bg-ember-wash"
                      : "border-line bg-paper-bright hover:border-line-strong"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-display text-lg text-ink">{ex.name}</span>
                      <span className="ml-2 text-sm text-muted">{ex.tagline}</span>
                    </div>
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${
                        active ? "border-ember bg-ember text-paper" : "border-line text-transparent"
                      }`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{ex.blurb}</p>
                  <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                    {ex.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-1.5 text-xs text-ink-soft">
                        <span className="size-1.5 rounded-full bg-ember" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-5 text-sm text-danger">
          {error}
        </p>
      )}

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStep((s) => s - 1);
            }}
            className="cursor-pointer rounded-full px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Back
          </button>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="cursor-pointer rounded-full px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              Skip for now
            </button>
          )}
          <button
            type="button"
            onClick={next}
            disabled={submitting}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-paper-bright shadow-[0_2px_8px_rgba(34,31,26,0.16)] transition-all duration-200 hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Saving…" : isLast ? "Finish" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-soft">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-paper-bright px-4 py-3 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none"
      />
    </div>
  );
}
