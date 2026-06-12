import Icon from "@/components/icons";
import { PRO_FEATURES, COMPARE } from "@/lib/pro";
import UpgradePanel from "@/components/pro/upgrade-panel";

function Eyebrow() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-ember/40 bg-ember/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-ember">
      <Icon name="sparkle" size={13} />
      Upward Pro
    </span>
  );
}

function Check() {
  return (
    <span className="grid size-5 place-items-center rounded-full bg-ember/15 text-ember">
      <Icon name="check" size={13} />
    </span>
  );
}

function Cell({ v, pro }: { v: string | boolean; pro?: boolean }) {
  if (typeof v === "boolean") {
    return v ? <Check /> : <span className="text-faint">—</span>;
  }
  return <span className={`text-sm ${pro ? "font-medium text-ink" : "text-muted"}`}>{v}</span>;
}

/** The free-user pricing view (hero + plan picker + features + comparison). */
export default function UpgradeView() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* hero */}
      <div className="u-rise text-center">
        <div className="flex justify-center">
          <Eyebrow />
        </div>
        <h1 className="mt-4 font-display text-[2.5rem] leading-tight tracking-tight text-ink">
          Climb further.
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-base leading-relaxed text-muted">
          Upward is free forever — track everything, build your character, climb the mountain. Pro
          adds the coach, the depth, and the flair for those who want the full ascent.
        </p>
      </div>

      {/* plan picker */}
      <UpgradePanel />

      {/* feature grid */}
      <div className="u-rise grid gap-3 sm:grid-cols-2">
        {PRO_FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-line bg-card p-5">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-full bg-ember/15 text-ember">
                <Icon name="sparkle" size={16} />
              </span>
              <h3 className="font-display text-base text-ink">{f.title}</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* compare table */}
      <div className="u-rise overflow-hidden rounded-2xl border border-line bg-card">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 border-b border-line px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-faint">
          <span>What you get</span>
          <span className="w-16 text-center">Free</span>
          <span className="w-20 text-center text-ember">Pro</span>
        </div>
        {COMPARE.map((row, i) => (
          <div
            key={row.label}
            className={`grid grid-cols-[1fr_auto_auto] items-center gap-x-6 px-5 py-3 ${
              i < COMPARE.length - 1 ? "border-b border-line" : ""
            }`}
          >
            <span className="text-sm text-ink-soft">{row.label}</span>
            <span className="grid w-16 place-items-center">
              <Cell v={row.free} />
            </span>
            <span className="grid w-20 place-items-center">
              <Cell v={row.pro} pro />
            </span>
          </div>
        ))}
      </div>

      <p className="u-rise pb-2 text-center text-xs text-faint">
        Questions? Pro is one subscription — no tiers, no add-ons, cancel whenever.
      </p>
    </div>
  );
}
