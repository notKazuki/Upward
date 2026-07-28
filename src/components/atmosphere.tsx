/**
 * Atmosphere — the shared warm canvas behind every screen.
 * A soft dawn glow + paper grain over the parchment base.
 * Purely decorative, so it is hidden from assistive tech.
 */
export default function Atmosphere() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ isolation: "isolate" }}
    >
      <div className="absolute inset-0 bg-paper" />
      {/* Grain sits directly on the static paper so its blend-mode composites
          once. Kept BELOW the aurora so the animated layer never re-triggers a
          full-screen backdrop blend (the main GPU cost in Brave). */}
      <div className="u-grain absolute inset-0" />
      {/* Coloured layers */}
      <div className="absolute inset-0">
        <div className="u-aurora u-fade" />
        <div className="u-glow u-fade absolute inset-0" />
      </div>
      {/* hairline vignette to settle the edges */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 30%, transparent 55%, rgba(34,31,26,0.06) 100%)",
        }}
      />
    </div>
  );
}
