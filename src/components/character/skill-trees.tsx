import type { SkillNode, SkillPath } from "@/lib/skill-trees";

export default function SkillTrees({ paths }: { paths: SkillPath[] }) {
  return (
    <div className="u-rise rounded-2xl border border-line bg-card p-6">
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">Skill trees</h3>
        <span className="text-xs text-faint">
          {paths.reduce((a, p) => a + p.unlocked, 0)} / {paths.reduce((a, p) => a + p.total, 0)} unlocked
        </span>
      </div>
      <p className="mb-5 text-sm text-muted">
        Each attribute is a path up the mountain. Earn its milestones to light the way.
      </p>

      <div className="space-y-6">
        {paths.map((p) => (
          <Path key={p.attr} path={p} />
        ))}
      </div>
    </div>
  );
}

function Path({ path }: { path: SkillPath }) {
  const { color, label, nodes, unlocked, total, next } = path;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="font-display text-sm text-ink">{label}</span>
        </div>
        <span className="text-xs text-faint">
          {unlocked}/{total}
        </span>
      </div>

      {/* Node track — a trail of milestones, easy → hard. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {nodes.map((n, i) => (
          <div key={n.id} className="flex items-center gap-1.5">
            {i > 0 && (
              <span
                className="h-px w-3"
                style={{ backgroundColor: nodes[i - 1].unlocked && n.unlocked ? color : "var(--color-line)" }}
                aria-hidden
              />
            )}
            <Node node={n} accent={color} />
          </div>
        ))}
      </div>

      {next?.progress && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-ink-soft">
              Next: <span className="text-ink">{next.label}</span>
            </span>
            <span className="text-[0.7rem] text-faint">
              {next.progress.current}/{next.progress.target}
            </span>
          </div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{ width: `${next.progress.pct}%`, backgroundColor: color }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Node({ node, accent }: { node: SkillNode; accent: string }) {
  const title = node.unlocked
    ? `${node.label} — ${node.description}`
    : node.progress
      ? `${node.label} (locked) — ${node.description} · ${node.progress.current}/${node.progress.target}`
      : `${node.label} (locked) — ${node.description}`;
  return (
    <span
      title={title}
      className="grid size-3.5 place-items-center rounded-full border transition-colors"
      style={
        node.unlocked
          ? { backgroundColor: node.color, borderColor: node.color }
          : node.progress && node.progress.pct > 0
            ? { borderColor: accent, backgroundColor: `${accent}22` }
            : { borderColor: "var(--color-line)", backgroundColor: "transparent" }
      }
    >
      {node.unlocked && (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--color-paper)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </span>
  );
}
