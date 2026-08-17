"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToday } from "@/lib/use-today";
import { GENERAL_DAYS } from "@/lib/workouts";
import { mealTypeLabel } from "@/lib/nutrition";
import {
  getQuickContext,
  repeatLastWorkout,
  quickMatch,
  copyYesterdayMeals,
  type QuickContext,
} from "@/app/app/quick/actions";
import { toggleTaken } from "@/app/app/supplement/actions";
import { logSession } from "@/app/app/workout/actions";
import { addJournalEntry } from "@/app/app/journal/actions";

const NAV: { label: string; href: string }[] = [
  { label: "Today", href: "/app" },
  { label: "Coach", href: "/app/coach" },
  { label: "Insights", href: "/app/insights" },
  { label: "You", href: "/app/stats" },
  { label: "Workout", href: "/app/workout" },
  { label: "Meal", href: "/app/meal" },
  { label: "Supplement", href: "/app/supplement" },
  { label: "Gaming", href: "/app/gaming" },
  { label: "Calendar", href: "/app/calendar" },
  { label: "Journal", href: "/app/journal" },
  { label: "Goals", href: "/app/goals" },
  { label: "Friends", href: "/app/friends" },
  { label: "Settings", href: "/app/settings" },
];

function yesterdayOf(today: string): string {
  const [y, m, d] = today.split("-").map(Number);
  const dt = new Date(y, m - 1, d - 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

const rowCls =
  "flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-paper";

/**
 * Universal quick-add: floating "+" button + Cmd/Ctrl-K. Log the everyday
 * stuff in two taps — supplements, a quick workout, a match result, a journal
 * line, yesterday's meals again, or repeat the last session.
 */
export default function QuickAdd() {
  const router = useRouter();
  const today = useToday();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [ctx, setCtx] = useState<QuickContext | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<"workout" | "journal" | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd/Ctrl-K toggle, Esc close.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Load context on open; focus the search box.
  useEffect(() => {
    if (!open || !today) return;
    let cancelled = false;
    void (async () => {
      const c = await getQuickContext(today, yesterdayOf(today));
      if (!cancelled) setCtx(c);
    })();
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, today]);

  function done(message: string) {
    setFlash(message);
    setError(null);
    setExpanded(null);
    router.refresh();
    if (today) {
      void getQuickContext(today, yesterdayOf(today)).then(setCtx);
    }
    window.setTimeout(() => setFlash(null), 2400);
  }

  function run(fn: () => Promise<{ error?: string } | void>, message: string) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) setError(res.error);
      else done(message);
    });
  }

  const q = query.trim().toLowerCase();
  const match = (label: string) => !q || label.toLowerCase().includes(q);

  const untaken = useMemo(
    () => (ctx?.supplements ?? []).filter((s) => !s.taken && match(`take ${s.name} supplement`)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx, q],
  );
  const navMatches = NAV.filter((n) => match(`go to ${n.label}`));

  function close() {
    setOpen(false);
    setQuery("");
    setExpanded(null);
    setError(null);
  }

  return (
    <>
      {/* FAB — left of the chat dock */}
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label="Quick add (Ctrl+K)"
        aria-expanded={open}
        title="Quick add — Ctrl+K"
        className="u-fab fixed z-40 grid size-14 cursor-pointer place-items-center rounded-full bg-ember text-paper shadow-[0_10px_30px_-8px_rgba(0,0,0,0.45)] transition-transform duration-200 hover:opacity-90 active:scale-95 md:size-11 md:border md:border-line md:bg-card/90 md:text-ink-soft md:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.3)] md:backdrop-blur-md md:hover:border-ember md:hover:text-ember"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close quick add"
            onClick={close}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <div className="u-anim-menu absolute left-1/2 top-[12%] w-[34rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-card shadow-[0_32px_80px_-24px_rgba(0,0,0,0.6)]">
            {/* Search */}
            <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-faint" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4-4" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Quick log or jump anywhere…"
                className="w-full bg-transparent text-[0.95rem] text-ink placeholder:text-faint focus:outline-none"
              />
              <kbd className="hidden shrink-0 rounded-md border border-line px-1.5 py-0.5 text-[0.65rem] text-faint sm:block">
                Esc
              </kbd>
            </div>

            <div className="max-h-[26rem] overflow-y-auto p-2">
              {flash && (
                <p className="mx-2 mb-2 rounded-lg bg-ember/10 px-3 py-2 text-sm font-medium text-ember">
                  {flash}
                </p>
              )}
              {error && (
                <p className="mx-2 mb-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              )}

              {/* Quick log */}
              {(untaken.length > 0 ||
                match("quick workout") ||
                match("journal a line") ||
                (ctx?.lastGame && match(`log a match ${ctx.lastGame.name} win loss`)) ||
                (ctx?.yesterdayMealTypes.length ?? 0) > 0) && (
                <Section label="Quick log">
                  {untaken.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => toggleTaken(s.id, today), `${s.name} taken ✓`)}
                      className={rowCls}
                    >
                      <span className="text-ink">
                        Take <span className="font-medium">{s.name}</span>
                      </span>
                      <span className="text-xs text-faint">supplement</span>
                    </button>
                  ))}

                  {ctx?.lastGame && match(`log a match ${ctx.lastGame.name} win loss`) && (
                    <div className={`${rowCls} cursor-default hover:bg-transparent`}>
                      <span className="text-ink">
                        Log a <span className="font-medium">{ctx.lastGame.name}</span> match
                      </span>
                      <span className="flex shrink-0 gap-1.5">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => quickMatch(ctx.lastGame!.id, true, today), "Win logged ✓")}
                          className="cursor-pointer rounded-full bg-ember px-3 py-1 text-xs font-semibold text-paper-bright hover:opacity-90"
                        >
                          Win
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => quickMatch(ctx.lastGame!.id, false, today), "Loss logged ✓")}
                          className="cursor-pointer rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink-soft hover:border-danger hover:text-danger"
                        >
                          Loss
                        </button>
                      </span>
                    </div>
                  )}

                  {(ctx?.yesterdayMealTypes ?? [])
                    .filter((t) => match(`same ${mealTypeLabel(t)} as yesterday meal`))
                    .map((t) => (
                      <button
                        key={t}
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () => copyYesterdayMeals(t, today, yesterdayOf(today)),
                            `${mealTypeLabel(t)} copied from yesterday ✓`,
                          )
                        }
                        className={rowCls}
                      >
                        <span className="text-ink">
                          Same <span className="font-medium">{mealTypeLabel(t).toLowerCase()}</span> as yesterday
                        </span>
                        <span className="text-xs text-faint">meal</span>
                      </button>
                    ))}

                  {match("quick workout") && (
                    <ExpandRow
                      label="Quick workout…"
                      hint="workout"
                      open={expanded === "workout"}
                      onToggle={() => setExpanded(expanded === "workout" ? null : "workout")}
                    >
                      <QuickWorkoutForm
                        days={[...(ctx?.workoutDays ?? []), ...GENERAL_DAYS]}
                        pending={pending}
                        onSubmit={(day, title, minutes) =>
                          run(
                            () =>
                              logSession({
                                day,
                                date: today,
                                title,
                                durationMin: minutes,
                                notes: "",
                                entries: [],
                              }),
                            "Workout logged ✓",
                          )
                        }
                      />
                    </ExpandRow>
                  )}

                  {match("journal a line") && (
                    <ExpandRow
                      label="Journal a line…"
                      hint="journal"
                      open={expanded === "journal"}
                      onToggle={() => setExpanded(expanded === "journal" ? null : "journal")}
                    >
                      <QuickJournalForm
                        pending={pending}
                        onSubmit={(body) =>
                          run(
                            () => addJournalEntry({ date: today, mood: null, body, imagePaths: [] }),
                            "Journal entry saved ✓",
                          )
                        }
                      />
                    </ExpandRow>
                  )}
                </Section>
              )}

              {/* Repeat */}
              {ctx?.lastWorkout && match(`repeat last workout ${ctx.lastWorkout.title}`) && (
                <Section label="Repeat">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => repeatLastWorkout(today), "Workout repeated for today ✓")}
                    className={rowCls}
                  >
                    <span className="text-ink">
                      Repeat last workout: <span className="font-medium">{ctx.lastWorkout.title}</span>
                    </span>
                    <span className="text-xs text-faint">
                      {ctx.lastWorkout.exercises > 0
                        ? `${ctx.lastWorkout.exercises} exercise${ctx.lastWorkout.exercises === 1 ? "" : "s"}`
                        : "workout"}
                    </span>
                  </button>
                </Section>
              )}

              {/* Go to */}
              {navMatches.length > 0 && (
                <Section label="Go to">
                  {navMatches.map((n) => (
                    <Link key={n.href} href={n.href} onClick={close} className={rowCls}>
                      <span className="text-ink-soft">{n.label}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-faint" aria-hidden>
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </Link>
                  ))}
                </Section>
              )}

              {!ctx && (
                <div className="grid place-items-center py-8">
                  <span className="size-5 animate-spin rounded-full border-2 border-line border-t-ember" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1.5">
      <p className="px-3 pb-1 pt-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-faint">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ExpandRow({
  label,
  hint,
  open,
  onToggle,
  children,
}: {
  label: string;
  hint: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button type="button" onClick={onToggle} aria-expanded={open} className={rowCls}>
        <span className="text-ink">{label}</span>
        <span className="text-xs text-faint">{hint}</span>
      </button>
      {open && <div className="mx-3 mb-2 rounded-xl border border-line bg-paper-bright p-3">{children}</div>}
    </div>
  );
}

function QuickWorkoutForm({
  days,
  pending,
  onSubmit,
}: {
  days: string[];
  pending: boolean;
  onSubmit: (day: string, title: string, minutes: number | null) => void;
}) {
  const uniqueDays = [...new Set(days)];
  const [day, setDay] = useState(uniqueDays[0] ?? "Full Body");
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("");
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {uniqueDays.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDay(d)}
            aria-pressed={day === d}
            className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              day === d
                ? "border-ember bg-ember/10 text-ink"
                : "border-line bg-card text-ink-soft hover:border-ember/50"
            }`}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`e.g. ${day} session`}
          className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-1.5 text-sm text-ink placeholder:text-faint focus:border-ember focus:outline-none"
        />
        <input
          type="number"
          min={0}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="min"
          className="w-16 rounded-lg border border-line bg-card px-2 py-1.5 text-center text-sm text-ink placeholder:text-faint focus:border-ember focus:outline-none"
        />
      </div>
      <button
        type="button"
        disabled={pending || !title.trim()}
        onClick={() => onSubmit(day, title.trim(), minutes === "" ? null : Number(minutes))}
        className="cursor-pointer rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-60"
      >
        Log it
      </button>
    </div>
  );
}

function QuickJournalForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (body: string) => void;
}) {
  const [body, setBody] = useState("");
  return (
    <div className="space-y-2.5">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder="One honest line about today…"
        className="w-full resize-none rounded-lg border border-line bg-card px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-faint focus:border-ember focus:outline-none"
      />
      <button
        type="button"
        disabled={pending || !body.trim()}
        onClick={() => onSubmit(body.trim())}
        className="cursor-pointer rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-60"
      >
        Save
      </button>
    </div>
  );
}
