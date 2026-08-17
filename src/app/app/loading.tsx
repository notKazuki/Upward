/** Route-level fallback. Mirrors the Today layout (a narrow single column) so
 * the jump from skeleton to content is as small as possible. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-5" aria-hidden>
      {/* header */}
      <div className="space-y-2">
        <div className="h-3 w-40 rounded bg-line/60" />
        <div className="h-8 w-52 rounded-lg bg-line" />
      </div>
      {/* capture */}
      <div className="h-[232px] animate-pulse rounded-2xl border border-line bg-card" />
      {/* feed */}
      <div className="h-[124px] animate-pulse rounded-2xl border border-line bg-card" />
      <div className="h-[188px] animate-pulse rounded-2xl border border-line bg-card" />
      <div className="h-[292px] animate-pulse rounded-2xl border border-line bg-card" />
    </div>
  );
}
