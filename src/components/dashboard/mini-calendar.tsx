"use client";

import { useState } from "react";
import Icon from "@/components/icons";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function MiniCalendar({
  activeDays = [],
}: {
  activeDays?: number[];
}) {
  const today = new Date();
  const [view, setView] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });

  const isCurrentMonth =
    view.year === today.getFullYear() && view.month === today.getMonth();

  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function shift(delta: number) {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-ink">
          {MONTHS[view.month]} {view.year}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="grid size-7 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-paper hover:text-ink"
          >
            <Icon name="chevronLeft" size={18} />
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Next month"
            className="grid size-7 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-paper hover:text-ink"
          >
            <Icon name="chevronRight" size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-[0.65rem] font-medium text-faint">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const isToday = isCurrentMonth && day === today.getDate();
          const isActive = isCurrentMonth && activeDays.includes(day);
          return (
            <div key={i} className="flex justify-center">
              <div
                className={`relative grid size-8 place-items-center rounded-full text-sm transition-colors ${
                  isToday
                    ? "bg-ink font-semibold text-paper-bright"
                    : "text-ink-soft hover:bg-paper"
                }`}
              >
                {day}
                {isActive && !isToday && (
                  <span className="absolute bottom-1 size-1 rounded-full bg-ember" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
