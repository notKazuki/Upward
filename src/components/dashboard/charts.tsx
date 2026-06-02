"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  macros,
  moodTrend,
  weeklyActivity,
  workoutsByCategory,
} from "@/lib/sample-data";
import { useThemeColors, type ChartColors } from "@/lib/use-theme-colors";

function axis(C: ChartColors) {
  return {
    tick: { fill: C.muted, fontSize: 12 },
    tickLine: false,
    axisLine: false,
  } as const;
}

function tooltip(C: ChartColors) {
  return {
    contentStyle: {
      backgroundColor: C.card,
      border: `1px solid ${C.line}`,
      borderRadius: 12,
      fontSize: 12,
      color: C.ink,
      boxShadow: "0 8px 24px -12px rgba(0,0,0,0.35)",
    },
    labelStyle: { color: C.muted, fontWeight: 600 },
    cursor: { fill: "color-mix(in srgb, currentColor 8%, transparent)" },
  } as const;
}

function Frame({ children }: { children: React.ReactElement }) {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function ActivityChart() {
  const C = useThemeColors();
  return (
    <Frame>
      <AreaChart data={weeklyActivity} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.ember} stopOpacity={0.35} />
            <stop offset="100%" stopColor={C.ember} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="day" {...axis(C)} />
        <YAxis {...axis(C)} width={40} />
        <Tooltip {...tooltip(C)} />
        <Area
          type="monotone"
          dataKey="minutes"
          name="Minutes"
          stroke={C.ember}
          strokeWidth={2.5}
          fill="url(#activityFill)"
          dot={{ r: 3, fill: C.ember, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </Frame>
  );
}

export function CategoryChart() {
  const C = useThemeColors();
  const palette = [C.ember, C.emberSoft, C.emberPale, C.muted];
  return (
    <Frame>
      <BarChart data={workoutsByCategory} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="category" {...axis(C)} />
        <YAxis {...axis(C)} width={40} />
        <Tooltip {...tooltip(C)} />
        <Bar dataKey="sessions" name="Sessions" radius={[6, 6, 0, 0]}>
          {workoutsByCategory.map((_, i) => (
            <Cell key={i} fill={palette[i % palette.length]} />
          ))}
        </Bar>
      </BarChart>
    </Frame>
  );
}

export function MacroChart() {
  const C = useThemeColors();
  const colors = [C.ember, C.emberSoft, C.emberPale];
  return (
    <div>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip {...tooltip(C)} />
            <Pie
              data={macros}
              dataKey="grams"
              nameKey="name"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={2}
              stroke="none"
            >
              {macros.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex justify-center gap-4">
        {macros.map((m, i) => (
          <li key={m.name} className="flex items-center gap-1.5 text-xs text-muted">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            {m.name}
            <span className="font-medium text-ink-soft">{m.grams}g</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MoodChart() {
  const C = useThemeColors();
  return (
    <Frame>
      <LineChart data={moodTrend} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="day" {...axis(C)} />
        <YAxis domain={[0, 5]} {...axis(C)} width={40} />
        <Tooltip {...tooltip(C)} />
        <Line
          type="monotone"
          dataKey="mood"
          name="Mood"
          stroke={C.ember}
          strokeWidth={2.5}
          dot={{ r: 3, fill: C.ember, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </Frame>
  );
}
