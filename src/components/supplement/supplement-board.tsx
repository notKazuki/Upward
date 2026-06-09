"use client";

import { useEffect, useState, useTransition } from "react";
import Icon from "@/components/icons";
import {
  addSupplement,
  deleteSupplement,
  setDoseTaken,
  toggleTaken,
  updateSupplement,
} from "@/app/app/supplement/actions";
import {
  TIMINGS,
  timingLabel,
  todayYmd,
  weekdayLetter,
  type Supplement,
  type Timing,
} from "@/lib/supplements";

const inputCls =
  "rounded-lg border border-line bg-paper-bright px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-ember focus:outline-none";

export default function SupplementBoard({
  supplements,
  takenBySupplement,
  doseByKey,
  days,
}: {
  supplements: Supplement[];
  takenBySupplement: Record<string, string[]>;
  doseByKey: Record<string, string>;
  days: string[];
}) {
  const today = todayYmd();
  const [pending, startTransition] = useTransition();
  // Optimistic overrides for checkboxes, keyed by `${supplementId}|${date}` —
  // today's row and the history dots both toggle through this.
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  function isTaken(id: string, date: string): boolean {
    const key = `${id}|${date}`;
    if (key in optimistic) return optimistic[key];
    return (takenBySupplement[id] ?? []).includes(date);
  }

  // Drop an optimistic override only once the refreshed server data agrees with
  // it. Clearing it eagerly (right after the action) raced the revalidation and
  // briefly showed the stale value — the "check → uncheck → check" flicker.
  useEffect(() => {
    setOptimistic((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      let changed = false;
      const next = { ...prev };
      for (const key of Object.keys(prev)) {
        const [id, date] = key.split("|");
        const serverTaken = (takenBySupplement[id] ?? []).includes(date);
        if (serverTaken === prev[key]) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [takenBySupplement]);

  function toggle(id: string, date: string = today) {
    const next = !isTaken(id, date);
    setOptimistic((o) => ({ ...o, [`${id}|${date}`]: next }));
    startTransition(() => {
      void toggleTaken(id, date);
    });
  }

  const takenToday = supplements.filter((s) => isTaken(s.id, today)).length;

  return (
    <div className="space-y-5">
      {/* Today summary */}
      {supplements.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-line bg-card px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">
              Today
            </p>
            <p className="mt-1 font-display text-2xl text-ink">
              {takenToday}
              <span className="text-lg text-muted"> / {supplements.length} taken</span>
            </p>
          </div>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-ember transition-[width] duration-500"
              style={{
                width: `${supplements.length ? (takenToday / supplements.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      <AddForm />

      {supplements.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card px-6 py-12 text-center">
          <p className="font-display text-xl text-ink">No supplements yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Add what you take above, then tick each one off as you go. Your last
            7 days show next to each.
          </p>
        </div>
      ) : (
        TIMINGS.map((t) => {
          const items = supplements.filter((s) => s.timing === t.id);
          if (items.length === 0) return null;
          return (
            <section key={t.id}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-faint">
                {t.label}
              </h3>
              <ul className="space-y-2">
                {items.map((s) => (
                  <SupplementRow
                    key={s.id}
                    supplement={s}
                    takenToday={isTaken(s.id, today)}
                    doseToday={doseByKey[`${s.id}|${today}`] ?? null}
                    days={days}
                    isTaken={isTaken}
                    onToggle={(date) => toggle(s.id, date)}
                  />
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

function SupplementRow({
  supplement: s,
  takenToday,
  doseToday,
  days,
  isTaken,
  onToggle,
}: {
  supplement: Supplement;
  takenToday: boolean;
  doseToday: string | null;
  days: string[];
  isTaken: (id: string, date: string) => boolean;
  onToggle: (date?: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const today = todayYmd();

  if (editing) {
    return (
      <li>
        <EditForm supplement={s} onClose={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border border-line bg-paper-bright px-3 py-2.5">
      <button
        type="button"
        onClick={() => onToggle()}
        aria-pressed={takenToday}
        aria-label={`Mark ${s.name} ${takenToday ? "not taken" : "taken"} today`}
        className={`grid size-7 shrink-0 cursor-pointer place-items-center rounded-md border transition-colors ${
          takenToday
            ? "border-ember bg-ember text-paper-bright"
            : "border-line-strong bg-card hover:border-ember"
        }`}
      >
        {takenToday && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12l5 5 9-11" /></svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">
          {s.name}
          {s.dose && <span className="ml-2 text-sm font-normal text-muted">{s.dose}</span>}
        </p>
        {takenToday && <DoseChip supplement={s} doseToday={doseToday} />}
      </div>

      {/* 7-day history — click a day to fix a missed (or wrong) check-off */}
      <div className="hidden items-center gap-1 sm:flex">
        {days.map((d) => {
          const on = isTaken(s.id, d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => onToggle(d)}
              title={`${d} — click to mark ${on ? "not taken" : "taken"}`}
              aria-label={`${s.name} on ${d}: ${on ? "taken" : "not taken"} — toggle`}
              aria-pressed={on}
              className={`grid size-5 cursor-pointer place-items-center rounded-full text-[0.6rem] font-medium transition-colors hover:ring-1 hover:ring-ember ${
                on ? "bg-ember/20 text-ember" : "bg-line text-faint"
              } ${d === today ? "ring-1 ring-ember/50" : ""}`}
            >
              {weekdayLetter(d)}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Edit ${s.name}`}
        className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-card hover:text-ink"
      >
        <Icon name="settings" size={16} />
      </button>
      <form action={deleteSupplement}>
        <input type="hidden" name="id" value={s.id} />
        <button
          type="submit"
          aria-label={`Delete ${s.name}`}
          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-card hover:text-danger"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" /></svg>
        </button>
      </form>
    </li>
  );
}

/** "Took a different amount today" — per-day dose override on the log. */
function DoseChip({
  supplement: s,
  doseToday,
}: {
  supplement: Supplement;
  doseToday: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(doseToday ?? "");
  const [saved, setSaved] = useState<string | null>(doseToday);
  const [pending, startTransition] = useTransition();
  const today = todayYmd();

  function save() {
    const v = value.trim();
    startTransition(async () => {
      const res = await setDoseTaken(s.id, today, v);
      if (!res.error) {
        setSaved(v || null);
        setOpen(false);
      }
    });
  }

  if (open) {
    return (
      <span className="mt-1 flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder={s.dose ? `usually ${s.dose}` : "amount taken"}
          autoFocus
          className="w-36 rounded-lg border border-line bg-card px-2.5 py-1 text-xs text-ink placeholder:text-faint focus:border-ember focus:outline-none"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="cursor-pointer text-xs font-medium text-ember hover:text-ink disabled:opacity-60"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="cursor-pointer text-xs text-muted hover:text-ink"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValue(saved ?? "");
        setOpen(true);
      }}
      className="mt-0.5 cursor-pointer text-xs text-faint transition-colors hover:text-ember"
    >
      {saved ? (
        <>
          Took <span className="font-medium text-ember">{saved}</span> today · edit
        </>
      ) : (
        "Took a different amount?"
      )}
    </button>
  );
}

function TimingPicker({
  value,
  onChange,
}: {
  value: Timing;
  onChange: (t: Timing) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {TIMINGS.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            aria-pressed={on}
            className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              on
                ? "border-ember bg-ember/10 text-ink"
                : "border-line bg-paper-bright text-ink-soft hover:border-ember/50"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function AddForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [timing, setTiming] = useState<Timing>("morning");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await addSupplement({ name, dose, timing });
      if (res.error) setError(res.error);
      else {
        setName("");
        setDose("");
        setTiming("morning");
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong bg-card/50 py-3.5 text-sm font-medium text-ink-soft transition-colors hover:border-ember hover:text-ember"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
        Add a supplement
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-card p-5">
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name — e.g. Creatine"
          className={`${inputCls} flex-1`}
          autoFocus
        />
        <input
          type="text"
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          placeholder="Dose — e.g. 5 g"
          className={`${inputCls} w-32`}
        />
      </div>
      <TimingPicker value={timing} onChange={setTiming} />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="cursor-pointer rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-70"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="cursor-pointer text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function EditForm({
  supplement: s,
  onClose,
}: {
  supplement: Supplement;
  onClose: () => void;
}) {
  const [name, setName] = useState(s.name);
  const [dose, setDose] = useState(s.dose ?? "");
  const [timing, setTiming] = useState<Timing>(s.timing);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await updateSupplement(s.id, { name, dose, timing });
      if (!res.error) onClose();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-ember/40 bg-card p-4">
      <div className="flex flex-wrap gap-3">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} flex-1`} />
        <input type="text" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="Dose" className={`${inputCls} w-32`} />
      </div>
      <TimingPicker value={timing} onChange={setTiming} />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="cursor-pointer rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-70"
        >
          Save
        </button>
        <button type="button" onClick={onClose} className="cursor-pointer text-sm font-medium text-muted transition-colors hover:text-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}
