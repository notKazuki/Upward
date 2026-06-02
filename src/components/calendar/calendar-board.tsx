"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  EVENT_TYPES,
  eventColor,
  eventLabel,
  monthCells,
  monthKey,
  monthLabel,
  parseMonth,
  shiftMonth,
  todayKey,
  todayYmd,
  ymd,
  type CalendarEvent,
  type EventType,
  type MonthActivity,
} from "@/lib/calendar";
import { addEvent, deleteEvent, toggleEvent } from "@/app/app/calendar/actions";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarBoard({
  monthStr,
  events,
  activity,
}: {
  monthStr: string;
  events: CalendarEvent[];
  activity: MonthActivity;
}) {
  const { year, month0 } = parseMonth(monthStr);
  const isThisMonth = monthStr === todayKey();
  const today = todayYmd();

  const [selected, setSelected] = useState<string>(
    isThisMonth ? today : ymd(year, month0, 1),
  );

  const cells = monthCells(monthStr);
  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const arr = eventsByDay.get(e.date) ?? [];
    arr.push(e);
    eventsByDay.set(e.date, arr);
  }
  const hasActivity = (day: number) =>
    activity.workouts.includes(day) ||
    activity.meals.includes(day) ||
    activity.gaming.includes(day);

  const selectedEvents = (eventsByDay.get(selected) ?? []).sort((a, b) =>
    (a.time ?? "99").localeCompare(b.time ?? "99"),
  );
  const selDay = Number(selected.slice(8, 10));
  const selActivity = [
    activity.workouts.includes(selDay) ? "Workout" : null,
    activity.meals.includes(selDay) ? "Meal" : null,
    activity.gaming.includes(selDay) ? "Gaming" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
      {/* Month grid */}
      <div className="rounded-2xl border border-line bg-card p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">{monthLabel(monthStr)}</h2>
          <div className="flex items-center gap-1">
            <Link
              href={`/app/calendar?month=${shiftMonth(monthStr, -1)}`}
              aria-label="Previous month"
              className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-paper hover:text-ink"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
            </Link>
            {!isThisMonth && (
              <Link
                href={`/app/calendar?month=${todayKey()}`}
                className="cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-paper hover:text-ink"
              >
                Today
              </Link>
            )}
            <Link
              href={`/app/calendar?month=${shiftMonth(monthStr, 1)}`}
              aria-label="Next month"
              className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-paper hover:text-ink"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="pb-2 text-center text-xs font-medium text-faint">
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />;
            const dayYmd = ymd(year, month0, day);
            const isToday = isThisMonth && dayYmd === today;
            const isSelected = dayYmd === selected;
            const dayEvents = eventsByDay.get(dayYmd) ?? [];
            const types = [...new Set(dayEvents.map((e) => e.type))].slice(0, 4);
            const active = hasActivity(day);
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(dayYmd)}
                className={`flex min-h-16 cursor-pointer flex-col gap-1 rounded-xl border p-1.5 text-left transition-colors ${
                  isSelected
                    ? "border-ember bg-ember-wash"
                    : "border-transparent hover:border-line"
                }`}
              >
                <span
                  className={`grid size-6 place-items-center rounded-full text-sm ${
                    isToday
                      ? "bg-ink font-semibold text-paper-bright"
                      : active
                        ? "font-medium text-ember"
                        : "text-ink-soft"
                  }`}
                >
                  {day}
                </span>
                {types.length > 0 && (
                  <span className="flex flex-wrap gap-1 px-0.5">
                    {types.map((t) => (
                      <span
                        key={t}
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: eventColor(t) }}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-3 text-xs text-muted">
          {EVENT_TYPES.map((t) => (
            <span key={t.id} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: t.color }} />
              {t.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="text-ember">●</span> tracked activity
          </span>
        </div>
      </div>

      {/* Day panel */}
      <DayPanel
        date={selected}
        events={selectedEvents}
        activity={selActivity}
      />
    </div>
  );
}

function DayPanel({
  date,
  events,
  activity,
}: {
  date: string;
  events: CalendarEvent[];
  activity: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("workout");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const heading = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  function add() {
    if (!title.trim()) {
      setError("Add a title.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await addEvent({
        date,
        time: time || null,
        type,
        title,
        notes: notes || null,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setTitle("");
      setTime("");
      setNotes("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <h3 className="font-display text-lg text-ink">{heading}</h3>

      {activity.length > 0 && (
        <p className="mt-1 text-xs text-muted">
          Tracked: <span className="text-ember">{activity.join(" · ")}</span>
        </p>
      )}

      {/* Events */}
      <ul className="mt-4 space-y-2">
        {events.length === 0 && (
          <li className="text-sm text-muted">Nothing planned yet.</li>
        )}
        {events.map((e) => (
          <li
            key={e.id}
            className="flex items-start gap-2.5 rounded-xl border border-line bg-paper-bright px-3 py-2"
          >
            <button
              type="button"
              onClick={() =>
                startTransition(() =>
                  toggleEvent(e.id, !e.done).then(() => router.refresh()),
                )
              }
              aria-label={e.done ? "Mark not done" : "Mark done"}
              className="mt-0.5 grid size-5 shrink-0 cursor-pointer place-items-center rounded-md border transition-colors"
              style={{
                borderColor: eventColor(e.type),
                backgroundColor: e.done ? eventColor(e.type) : "transparent",
              }}
            >
              {e.done && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12l5 5 9-11" /></svg>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${e.done ? "text-faint line-through" : "text-ink"}`}>
                {e.time && <span className="mr-1.5 text-muted">{e.time.slice(0, 5)}</span>}
                {e.title}
              </p>
              <span
                className="mt-0.5 inline-block text-[0.7rem] font-medium"
                style={{ color: eventColor(e.type) }}
              >
                {eventLabel(e.type)}
              </span>
              {e.notes && <p className="text-xs text-muted">{e.notes}</p>}
            </div>
            <button
              type="button"
              onClick={() =>
                startTransition(() =>
                  deleteEvent(e.id).then(() => router.refresh()),
                )
              }
              aria-label="Delete plan"
              className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-faint transition-colors hover:text-danger"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </li>
        ))}
      </ul>

      {/* Add form */}
      <div className="mt-4 border-t border-line pt-4">
        <p className="mb-2 text-sm font-medium text-ink-soft">Add a plan</p>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Leg day"
          className="mb-2 w-full rounded-xl border border-line bg-paper-bright px-3.5 py-2 text-sm text-ink placeholder:text-faint focus:border-ember focus:outline-none"
        />
        <div className="mb-2 flex flex-wrap gap-1.5">
          {EVENT_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              aria-pressed={type === t.id}
              className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                type === t.id
                  ? "border-ember bg-ember text-paper-bright"
                  : "border-line bg-paper-bright text-ink-soft hover:border-line-strong"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mb-2 flex gap-2">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-label="Time (optional)"
            className="rounded-xl border border-line bg-paper-bright px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
          />
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="flex-1 rounded-xl border border-line bg-paper-bright px-3.5 py-2 text-sm text-ink placeholder:text-faint focus:border-ember focus:outline-none"
          />
        </div>
        {error && <p className="mb-2 text-sm text-danger">{error}</p>}
        <button
          type="button"
          onClick={add}
          disabled={pending}
          className="cursor-pointer rounded-xl bg-ink px-5 py-2 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-70"
        >
          {pending ? "Saving…" : "Add plan"}
        </button>
      </div>
    </div>
  );
}
