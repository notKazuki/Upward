/**
 * Atmosphere — the shared warm canvas behind every screen.
 * A soft dawn glow + paper grain over the parchment base.
 * Purely decorative, so it is hidden from assistive tech.
 */
export default function Atmosphere() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-paper" />
      <div className="u-glow u-fade absolute inset-0" />
      <div className="u-grain absolute inset-0" />
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
