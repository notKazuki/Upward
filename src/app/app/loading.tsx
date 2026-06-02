export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-5">
      <div className="space-y-2">
        <div className="h-8 w-44 rounded-lg bg-line" />
        <div className="h-4 w-64 rounded bg-line/60" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl border border-line bg-card" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="h-72 rounded-2xl border border-line bg-card lg:col-span-2" />
        <div className="h-72 rounded-2xl border border-line bg-card" />
        <div className="h-64 rounded-2xl border border-line bg-card lg:col-span-2" />
        <div className="h-64 rounded-2xl border border-line bg-card" />
      </div>
    </div>
  );
}
