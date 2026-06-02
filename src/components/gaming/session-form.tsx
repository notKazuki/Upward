"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addSession, type SessionState } from "@/app/app/gaming/actions";
import DateField from "@/components/date-field";

const INITIAL: SessionState = {};
const TODAY = new Date().toISOString().slice(0, 10);

export default function SessionForm({ gameId }: { gameId: string }) {
  const [state, action, pending] = useActionState(addSession, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const [date, setDate] = useState(TODAY);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setDate(TODAY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ts, state.ok]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <input type="hidden" name="game_id" value={gameId} />

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-soft">Date</span>
        <DateField name="played_on" value={date} onChange={setDate} max={TODAY} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Num name="matches" label="Matches" placeholder="5" />
        <Num name="wins" label="Wins" placeholder="3" />
        <Num name="losses" label="Losses" placeholder="2" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Num name="hours" label="Hours" placeholder="2.5" step="0.25" />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-soft">
            Rank <span className="text-faint">(optional)</span>
          </span>
          <input
            type="text"
            name="rank"
            placeholder="e.g. Gold 2"
            className="rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-soft">
          Notes <span className="text-faint">(optional)</span>
        </span>
        <textarea
          name="notes"
          rows={2}
          placeholder="How did it go?"
          className="resize-none rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none"
        />
      </label>

      {state.error && (
        <p role="alert" className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-paper-bright shadow-[0_2px_8px_rgba(34,31,26,0.16)] transition-all duration-200 hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Saving…" : "Log session"}
        </button>
        {state.ok && !pending && (
          <span role="status" className="text-sm text-ember">
            Logged.
          </span>
        )}
      </div>
    </form>
  );
}

function Num({
  name,
  label,
  placeholder,
  step,
}: {
  name: string;
  label: string;
  placeholder?: string;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink-soft">{label}</span>
      <input
        type="number"
        name={name}
        min={0}
        step={step}
        inputMode="decimal"
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none"
      />
    </label>
  );
}
