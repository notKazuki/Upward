"use client";

import { useMemo, useState } from "react";
import { cardSvg, type CardData } from "@/lib/character-card";

export default function CharacterCard({ data }: { data: CardData }) {
  const svg = useMemo(() => cardSvg(data), [data]);
  const [busy, setBusy] = useState(false);

  function download() {
    setBusy(true);
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = 1080 * scale;
      canvas.height = 1080 * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        setBusy(false);
        return;
      }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, 1080, 1080);
      URL.revokeObjectURL(url);
      canvas.toBlob((png) => {
        if (png) {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(png);
          a.download = `upward-${data.username ?? "character"}.png`;
          a.click();
          URL.revokeObjectURL(a.href);
        }
        setBusy(false);
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setBusy(false);
    };
    img.src = url;
  }

  return (
    <div className="u-rise rounded-2xl border border-line bg-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg text-ink">Your card</h3>
          <p className="text-sm text-muted">A shareable snapshot of your climb — post it anywhere.</p>
        </div>
        <button
          type="button"
          onClick={download}
          disabled={busy}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ember px-4 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
          </svg>
          {busy ? "Preparing…" : "Download card"}
        </button>
      </div>
      <div
        className="mx-auto max-w-md overflow-hidden rounded-2xl [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
        // The SVG is self-contained (literal colors, generic fonts) — safe to inline.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
