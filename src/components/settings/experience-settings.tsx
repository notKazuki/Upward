"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EXPERIENCES, type Experience } from "@/lib/experience";
import { saveExperience } from "@/app/app/settings/experience-actions";

export default function ExperienceSettings({ current }: { current: Experience }) {
  const [value, setValue] = useState<Experience>(current);
  const [pending, start] = useTransition();
  const router = useRouter();

  function pick(id: Experience) {
    if (id === value || pending) return;
    const prev = value;
    setValue(id);
    start(async () => {
      const r = await saveExperience(id);
      if (r.error) setValue(prev);
      else router.refresh();
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {EXPERIENCES.map((ex) => {
        const active = value === ex.id;
        return (
          <button
            key={ex.id}
            type="button"
            onClick={() => pick(ex.id)}
            aria-pressed={active}
            disabled={pending}
            className={`cursor-pointer rounded-2xl border p-4 text-left transition-colors duration-200 disabled:opacity-70 ${
              active ? "border-ember bg-ember-wash" : "border-line bg-paper-bright hover:border-line-strong"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-base text-ink">{ex.name}</span>
              {active && (
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-ember">Active</span>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">{ex.blurb}</p>
          </button>
        );
      })}
    </div>
  );
}
