"use client";

import { useEffect, useRef, useState } from "react";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fromISO(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatLong(s: string) {
  return fromISO(s).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
/** Editable representation (MM/DD/YYYY) for typing. */
function fmtInput(s: string) {
  const d = fromISO(s);
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}
/** Parse a typed date (MM/DD/YYYY, M/D/YYYY, or YYYY-MM-DD) → ISO, or null. */
function parseInput(s: string): string | null {
  const str = s.trim();
  let y: number, mo: number, d: number;
  let m: RegExpMatchArray | null;
  if ((m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) {
    [y, mo, d] = [+m[1], +m[2], +m[3]];
  } else if ((m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/))) {
    [mo, d, y] = [+m[1], +m[2], +m[3]];
  } else {
    return null;
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return null; // rejects impossible dates like 02/30
  }
  return toISO(dt);
}

/**
 * Themed date picker. Controlled (value + onChange) or uncontrolled
 * (defaultValue). When `name` is given it also renders a hidden input so it
 * works inside FormData / Server Action forms.
 */
export default function DateField({
  value,
  defaultValue,
  onChange,
  name,
  max,
  min,
  id,
  placeholder = "Select a date",
}: {
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  name?: string;
  max?: string;
  min?: string;
  id?: string;
  placeholder?: string;
}) {
  const [internal, setInternal] = useState(value ?? defaultValue ?? "");
  const current = value !== undefined ? value : internal;

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"days" | "years">("days");
  // Typed-entry state: while editing, show raw text; otherwise the pretty date.
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  const start = current ? fromISO(current) : max ? fromISO(max) : new Date();
  const [vy, setVy] = useState(start.getFullYear());
  const [vm, setVm] = useState(start.getMonth());
  const [focus, setFocus] = useState(current || toISO(start));

  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const maxD = max ? fromISO(max) : null;
  const minD = min ? fromISO(min) : null;
  const isDisabled = (d: Date) =>
    (maxD !== null && d > maxD) || (minD !== null && d < minD);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Move DOM focus to the focused day when navigating the grid.
  useEffect(() => {
    if (open && mode === "days") {
      gridRef.current
        ?.querySelector<HTMLButtonElement>(`[data-iso="${focus}"]`)
        ?.focus();
    }
  }, [focus, open, mode]);

  function setValue(iso: string) {
    if (value === undefined) setInternal(iso);
    onChange?.(iso);
  }
  function commit(iso: string) {
    setValue(iso);
    setOpen(false);
  }

  function onType(raw: string) {
    setText(raw);
    const iso = parseInput(raw);
    if (iso && !isDisabled(fromISO(iso))) {
      setValue(iso);
      const d = fromISO(iso);
      setVy(d.getFullYear());
      setVm(d.getMonth());
      setFocus(iso);
    }
  }

  function openPicker() {
    const base = current ? fromISO(current) : maxD ?? new Date();
    setVy(base.getFullYear());
    setVm(base.getMonth());
    setFocus(current || toISO(maxD ?? new Date()));
    setMode("days");
    setOpen(true);
  }

  function shiftFocus(days: number) {
    const d = fromISO(focus);
    d.setDate(d.getDate() + days);
    if (isDisabled(d)) return;
    setFocus(toISO(d));
    setVy(d.getFullYear());
    setVm(d.getMonth());
  }

  function onGridKey(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowLeft": e.preventDefault(); shiftFocus(-1); break;
      case "ArrowRight": e.preventDefault(); shiftFocus(1); break;
      case "ArrowUp": e.preventDefault(); shiftFocus(-7); break;
      case "ArrowDown": e.preventDefault(); shiftFocus(7); break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (!isDisabled(fromISO(focus))) commit(focus);
        break;
      case "Escape": e.preventDefault(); setOpen(false); break;
    }
  }

  function gotoMonth(delta: number) {
    const d = new Date(vy, vm + delta, 1);
    setVy(d.getFullYear());
    setVm(d.getMonth());
  }

  const firstWeekday = new Date(vy, vm, 1).getDay();
  const daysInMonth = new Date(vy, vm + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const yearPageStart = vy - (((vy % 12) + 12) % 12);

  return (
    <div ref={rootRef} className="relative">
      {name && <input type="hidden" name={name} value={current} />}

      <div className="flex w-full items-center gap-2 rounded-xl border border-line bg-paper-bright px-3 py-2.5 transition-colors focus-within:border-ember">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          value={editing ? text : current ? formatLong(current) : ""}
          placeholder={placeholder}
          onFocus={() => {
            setEditing(true);
            setText(current ? fmtInput(current) : "");
          }}
          onChange={(e) => onType(e.target.value)}
          onBlur={() => setEditing(false)}
          className="w-full bg-transparent text-[0.95rem] text-ink placeholder:text-faint focus:outline-none"
        />
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : openPicker())}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Open calendar"
          className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-paper hover:text-ink"
        >
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden
          >
            <rect x="3" y="4.5" width="18" height="16" rx="2" />
            <path d="M3 9h18M8 2.5v4M16 2.5v4" />
          </svg>
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Choose date"
          className="u-anim-menu absolute left-0 top-full z-40 mt-2 w-[18rem] rounded-2xl border border-line bg-card p-3 shadow-[0_18px_50px_-24px_rgba(34,31,26,0.5)]"
        >
          {/* Header */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMode((m) => (m === "days" ? "years" : "days"))}
              className="cursor-pointer rounded-lg px-2 py-1 text-sm font-medium text-ink transition-colors hover:bg-paper"
            >
              {mode === "days" ? `${MONTHS[vm]} ${vy}` : `${yearPageStart}–${yearPageStart + 11}`}
            </button>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label={mode === "days" ? "Previous month" : "Previous years"}
                onClick={() => (mode === "days" ? gotoMonth(-1) : setVy((y) => y - 12))}
                className="grid size-7 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-paper hover:text-ink"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
              </button>
              <button
                type="button"
                aria-label={mode === "days" ? "Next month" : "Next years"}
                onClick={() => (mode === "days" ? gotoMonth(1) : setVy((y) => y + 12))}
                className="grid size-7 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-paper hover:text-ink"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </div>
          </div>

          {mode === "years" ? (
            <div className="grid grid-cols-3 gap-1.5 p-1">
              {Array.from({ length: 12 }, (_, i) => yearPageStart + i).map((y) => {
                const selected = current && fromISO(current).getFullYear() === y;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setVy(y);
                      setMode("days");
                    }}
                    className={`cursor-pointer rounded-lg py-2 text-sm transition-colors ${
                      selected
                        ? "bg-ink text-paper-bright"
                        : "text-ink-soft hover:bg-paper"
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 text-center">
                {WEEKDAYS.map((d, i) => (
                  <div key={i} className="pb-1 text-[0.65rem] font-medium text-faint">
                    {d}
                  </div>
                ))}
              </div>
              <div
                ref={gridRef}
                role="grid"
                onKeyDown={onGridKey}
                className="grid grid-cols-7 gap-y-0.5 text-center"
              >
                {cells.map((day, i) => {
                  if (day === null) return <div key={i} />;
                  const iso = `${vy}-${pad(vm + 1)}-${pad(day)}`;
                  const dis = isDisabled(fromISO(iso));
                  const selected = current === iso;
                  const isFocus = focus === iso;
                  return (
                    <div key={i} className="flex justify-center">
                      <button
                        type="button"
                        data-iso={iso}
                        disabled={dis}
                        tabIndex={isFocus ? 0 : -1}
                        aria-selected={selected}
                        onClick={() => commit(iso)}
                        className={`grid size-9 place-items-center rounded-full text-sm transition-colors ${
                          dis
                            ? "cursor-not-allowed text-faint/40"
                            : selected
                              ? "cursor-pointer bg-ink font-semibold text-paper-bright"
                              : "cursor-pointer text-ink-soft hover:bg-paper"
                        }`}
                      >
                        {day}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
