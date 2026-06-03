"use client";

import { useState, useTransition } from "react";
import DateField from "@/components/date-field";
import {
  deleteGoal,
  deleteLog,
  logProgress,
  setGoalStatus,
  updateGoal,
} from "@/app/app/goals/actions";
import {
  categoryMeta,
  currentValue,
  deadlineState,
  formatDate,
  formatValue,
  goalTypeLabel,
  progressPct,
  todayYmd,
  type Goal,
  type GoalLog,
} from "@/lib/goals";

const inputCls =
  "w-full rounded-lg border border-line bg-paper-bright px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-ember focus:outline-none";

export default function GoalCard({
  goal,
  logs,
}: {
  goal: Goal;
  logs: GoalLog[];
}) {
  const [pending, startTransition] = useTransition();
  const [showLog, setShowLog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editing, setEditing] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const cat = categoryMeta(goal.category);
  const pctValue = progressPct(goal, logs);
  const value = currentValue(goal, logs);
  const dl = deadlineState(goal);
  const isActive = goal.status === "active";
  const isCompleted = goal.status === "completed";
  const checkedInToday = logs.some((l) => l.logged_on === todayYmd());

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      const res = await fn();
      if (
        res &&
        typeof res === "object" &&
        "completed" in res &&
        (res as { completed?: boolean }).completed
      ) {
        setCelebrate(true);
      }
    });
  }

  return (
    <div
      className={`u-rise rounded-2xl border bg-card p-5 transition-colors ${
        isCompleted ? "border-ember/60" : "border-line"
      } ${goal.status === "abandoned" ? "opacity-60" : ""}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-ink-soft">
              <span className="inline-block size-2 rounded-full" style={{ backgroundColor: cat.color }} />
              {cat.label}
            </span>
            <span className="text-faint">· {goalTypeLabel(goal.type)}</span>
            <StatusBadge status={goal.status} />
            {dl === "overdue" && <Badge tone="danger">Overdue</Badge>}
            {dl === "soon" && <Badge tone="warn">Due soon</Badge>}
          </div>
          <h3 className="truncate font-display text-lg text-ink">{goal.title}</h3>
          {goal.why && (
            <p className="mt-1 text-sm italic leading-relaxed text-muted">
              “{goal.why}”
            </p>
          )}
        </div>

        <Kebab
          goal={goal}
          pending={pending}
          onEdit={() => setEditing((e) => !e)}
          onStatus={(s) => run(() => setGoalStatus(goal.id, s))}
        />
      </div>

      {/* Celebration */}
      {celebrate && (
        <div className="u-rise mt-3 flex items-center gap-2 rounded-xl border border-ember/50 bg-ember/10 px-4 py-2.5 text-sm font-medium text-ink">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-ember" aria-hidden><path d="M5 12l5 5 9-11" /></svg>
          Goal complete — nice work. The journey&rsquo;s below whenever you want to look back.
        </div>
      )}

      {/* Progress */}
      <div className="mt-4">
        {goal.type === "binary" ? (
          <p className="text-sm text-muted">
            {isCompleted ? "Done." : "Not done yet."}
          </p>
        ) : (
          <>
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="text-ink-soft">
                {goal.type === "streak" ? "Current streak" : "Progress"}
              </span>
              <span className="text-muted">
                <span className="font-medium text-ink">{formatValue(goal, value)}</span>
                {" / "}
                {formatValue(goal, goal.target_value ?? 0)}
                <span className="ml-2 text-faint">{pctValue}%</span>
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-ember transition-[width] duration-500"
                style={{ width: `${pctValue}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      {isActive && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {goal.type === "binary" && (
            <ActionButton onClick={() => run(() => setGoalStatus(goal.id, "completed"))} disabled={pending}>
              Mark complete
            </ActionButton>
          )}
          {goal.type === "streak" && (
            <ActionButton
              onClick={() =>
                run(() => logProgress({ goalId: goal.id, date: todayYmd() }))
              }
              disabled={pending || checkedInToday}
            >
              {checkedInToday ? "Checked in today" : "Check in today"}
            </ActionButton>
          )}
          {goal.type === "numeric" && (
            <button
              type="button"
              onClick={() => setShowLog((s) => !s)}
              className="cursor-pointer rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft"
            >
              {showLog ? "Close" : "Log progress"}
            </button>
          )}
          {logs.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory((s) => !s)}
              className="cursor-pointer text-sm font-medium text-ember transition-colors hover:text-ink"
            >
              {showHistory ? "Hide history" : `History (${logs.length})`}
            </button>
          )}
        </div>
      )}

      {/* completed/paused/abandoned still allow viewing history */}
      {!isActive && logs.length > 0 && (
        <button
          type="button"
          onClick={() => setShowHistory((s) => !s)}
          className="mt-4 cursor-pointer text-sm font-medium text-ember transition-colors hover:text-ink"
        >
          {showHistory ? "Hide history" : `History (${logs.length})`}
        </button>
      )}

      {/* Numeric log form */}
      {showLog && goal.type === "numeric" && isActive && (
        <LogForm
          goal={goal}
          pending={pending}
          onSubmit={(payload) =>
            run(async () => {
              const res = await logProgress(payload);
              if (!res.error) setShowLog(false);
              return res;
            })
          }
        />
      )}

      {/* History */}
      {showHistory && (
        <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
          {logs.map((l) => (
            <li key={l.id} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <span className="text-ink-soft">{formatDate(l.logged_on)}</span>
                {l.value != null && goal.type === "numeric" && (
                  <span className="ml-2 font-medium text-ink">
                    +{formatValue(goal, l.value)}
                  </span>
                )}
                {l.note && <p className="text-muted">{l.note}</p>}
              </div>
              <button
                type="button"
                onClick={() => startTransition(() => deleteLog(l.id).then(() => {}))}
                aria-label="Delete check-in"
                className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-paper hover:text-danger"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Edit */}
      {editing && (
        <EditForm
          goal={goal}
          pending={pending}
          onCancel={() => setEditing(false)}
          onSave={(patch) =>
            run(async () => {
              const res = await updateGoal(goal.id, patch);
              if (!res.error) setEditing(false);
              return res;
            })
          }
        />
      )}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="cursor-pointer rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:cursor-default disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: Goal["status"] }) {
  if (status === "active") return null;
  const tone =
    status === "completed" ? "ember" : status === "paused" ? "muted" : "muted";
  const label =
    status === "completed" ? "Completed" : status === "paused" ? "Paused" : "Abandoned";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide ${
        tone === "ember" ? "bg-ember/15 text-ember" : "bg-line text-muted"
      }`}
    >
      {label}
    </span>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "danger" | "warn" }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide ${
        tone === "danger" ? "bg-danger/15 text-danger" : "bg-[#c9a23f]/20 text-[#9a7d1e]"
      }`}
    >
      {children}
    </span>
  );
}

function Kebab({
  goal,
  pending,
  onEdit,
  onStatus,
}: {
  goal: Goal;
  pending: boolean;
  onEdit: () => void;
  onStatus: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const act = (fn: () => void) => {
    fn();
    setOpen(false);
  };
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Goal options"
        aria-expanded={open}
        className="grid size-8 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-paper hover:text-ink"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" /></svg>
      </button>
      {open && (
        <>
          <button type="button" aria-hidden tabIndex={-1} className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
          <div className="u-anim-menu absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-line bg-card p-1.5 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.45)]">
            <MenuItem onClick={() => act(onEdit)}>Edit / adjust</MenuItem>
            {goal.status === "active" && (
              <>
                <MenuItem onClick={() => act(() => onStatus("paused"))} disabled={pending}>Pause</MenuItem>
                {goal.type !== "binary" && (
                  <MenuItem onClick={() => act(() => onStatus("completed"))} disabled={pending}>Mark complete</MenuItem>
                )}
                <MenuItem onClick={() => act(() => onStatus("abandoned"))} disabled={pending}>Abandon</MenuItem>
              </>
            )}
            {(goal.status === "paused" || goal.status === "abandoned") && (
              <MenuItem onClick={() => act(() => onStatus("active"))} disabled={pending}>Reactivate</MenuItem>
            )}
            {goal.status === "completed" && (
              <MenuItem onClick={() => act(() => onStatus("active"))} disabled={pending}>Reopen</MenuItem>
            )}
            <DeleteItem goalId={goal.id} />
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-soft transition-colors hover:bg-paper disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function DeleteItem({ goalId }: { goalId: string }) {
  return (
    <form action={deleteGoal}>
      <input type="hidden" name="id" value={goalId} />
      <button
        type="submit"
        className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium text-danger transition-colors hover:bg-paper"
      >
        Delete
      </button>
    </form>
  );
}

function LogForm({
  goal,
  pending,
  onSubmit,
}: {
  goal: Goal;
  pending: boolean;
  onSubmit: (p: { goalId: string; date: string; value?: number | null; note?: string | null }) => void;
}) {
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayYmd());
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-line bg-paper-bright p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">
            Amount{goal.unit ? ` (${goal.unit})` : ""}
          </span>
          <input
            type="number"
            min={0}
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 5"
            className={`${inputCls} w-28`}
            autoFocus
          />
        </label>
        <label className="flex min-w-[8rem] flex-col gap-1.5">
          <span className="text-xs text-muted">Date</span>
          <DateField value={date} onChange={setDate} max={todayYmd()} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Note (optional)</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="How did it go? Anything worth remembering…"
          className={inputCls}
        />
      </label>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          onSubmit({ goalId: goal.id, date, value: value ? Number(value) : null, note })
        }
        className="cursor-pointer rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-70"
      >
        {pending ? "Saving…" : "Add check-in"}
      </button>
    </div>
  );
}

function EditForm({
  goal,
  pending,
  onCancel,
  onSave,
}: {
  goal: Goal;
  pending: boolean;
  onCancel: () => void;
  onSave: (patch: {
    title?: string;
    target_value?: number | null;
    unit?: string | null;
    deadline?: string | null;
    why?: string | null;
  }) => void;
}) {
  const [title, setTitle] = useState(goal.title);
  const [target, setTarget] = useState(goal.target_value != null ? String(goal.target_value) : "");
  const [unit, setUnit] = useState(goal.unit ?? "");
  const [deadline, setDeadline] = useState(goal.deadline ?? "");
  const [why, setWhy] = useState(goal.why ?? "");
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-line bg-paper-bright p-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Goal</span>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
      </label>
      {goal.type !== "binary" && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">
              {goal.type === "streak" ? "Target (days)" : "Target"}
            </span>
            <input type="number" min={1} value={target} onChange={(e) => setTarget(e.target.value)} className={`${inputCls} w-28`} />
          </label>
          {goal.type === "numeric" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">Unit</span>
              <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} className={`${inputCls} w-36`} />
            </label>
          )}
        </div>
      )}
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Why this matters</span>
        <textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
      </label>
      <div>
        <span className="mb-1.5 block text-xs text-muted">Deadline</span>
        <DateField value={deadline} onChange={setDeadline} placeholder="No deadline" />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            onSave({
              title,
              target_value: target ? Number(target) : null,
              unit,
              deadline: deadline || null,
              why,
            })
          }
          className="cursor-pointer rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-70"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button type="button" onClick={onCancel} className="cursor-pointer text-sm font-medium text-muted transition-colors hover:text-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}
