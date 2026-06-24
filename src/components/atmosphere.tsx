import type { Experience } from "@/lib/experience";

/**
 * Atmosphere — the shared warm canvas behind every screen.
 * A soft dawn glow + paper grain over the parchment base.
 * Purely decorative, so it is hidden from assistive tech.
 *
 * Classic experience: the coloured aurora/glow is dimmed for a calmer, quieter
 * canvas (the paper + grain base stay). Motion is preserved.
 */
export default function Atmosphere({ experience = "gamified" }: { experience?: Experience }) {
  const calm = experience === "classic";
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
      {/* Coloured layers — dimmed in classic via a non-animated wrapper so the
          dimming sticks (the layers themselves animate their own opacity). */}
      <div className="absolute inset-0" style={calm ? { opacity: 0.38 } : undefined}>
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
