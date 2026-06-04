"use client";

import { useEffect, useRef, useState } from "react";

const VIEWPORT = 288; // on-screen square (px)
const OUTPUT = 512; // exported avatar size (px)

/**
 * Dependency-free square image cropper. The image is positioned by a CSS
 * transform (pan + zoom); on confirm we map the square viewport back to the
 * source pixels and draw them onto a 512×512 canvas. Always kept covering the
 * frame, so the avatar can never have empty edges.
 */
export default function ImageCropper({
  src,
  fileType,
  onCancel,
  onCropped,
}: {
  src: string;
  fileType: string;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // image top-left in viewport space
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [busy, setBusy] = useState(false);

  // Load the image and center it.
  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      setImg(image);
      const base = Math.max(VIEWPORT / image.naturalWidth, VIEWPORT / image.naturalHeight);
      const dw = image.naturalWidth * base;
      const dh = image.naturalHeight * base;
      setZoom(1);
      setOffset({ x: (VIEWPORT - dw) / 2, y: (VIEWPORT - dh) / 2 });
    };
    image.src = src;
  }, [src]);

  const base = img ? Math.max(VIEWPORT / img.naturalWidth, VIEWPORT / img.naturalHeight) : 1;
  const scale = base * zoom;
  const dw = img ? img.naturalWidth * scale : 0;
  const dh = img ? img.naturalHeight * scale : 0;

  // Clamp an offset so the image always covers the frame, at a given zoom.
  function clampAt(x: number, y: number, z: number) {
    if (!img) return { x, y };
    const s = base * z;
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    return {
      x: Math.min(0, Math.max(VIEWPORT - w, x)),
      y: Math.min(0, Math.max(VIEWPORT - h, y)),
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    setDragging(true);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const nx = drag.current.ox + (e.clientX - drag.current.x);
    const ny = drag.current.oy + (e.clientY - drag.current.y);
    setOffset(clampAt(nx, ny, zoom));
  }
  function onPointerUp() {
    drag.current = null;
    setDragging(false);
  }

  function confirm() {
    if (!img) return;
    setBusy(true);
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setBusy(false);
      return;
    }
    // Source rect (in natural image px) that the viewport currently shows.
    const srcSize = VIEWPORT / scale;
    const srcX = -offset.x / scale;
    const srcY = -offset.y / scale;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT, OUTPUT);
    const type = fileType === "image/png" ? "image/png" : "image/jpeg";
    canvas.toBlob(
      (blob) => {
        setBusy(false);
        if (blob) onCropped(blob);
      },
      type,
      0.9,
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Crop your photo">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-5 shadow-xl">
        <h2 className="mb-1 font-display text-lg text-ink">Crop your photo</h2>
        <p className="mb-4 text-xs text-muted">Drag to reposition · use the slider to zoom.</p>

        <div
          className="relative mx-auto touch-none overflow-hidden rounded-full ring-1 ring-line"
          style={{ width: VIEWPORT, height: VIEWPORT, cursor: dragging ? "grabbing" : "grab" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                left: offset.x,
                top: offset.y,
                width: dw,
                height: dh,
                maxWidth: "none",
                userSelect: "none",
              }}
            />
          )}
        </div>

        <label className="mt-4 flex items-center gap-3">
          <span className="text-xs font-medium text-ink-soft">Zoom</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => {
              const z = Number(e.target.value);
              setZoom(z);
              setOffset((o) => clampAt(o.x, o.y, z));
            }}
            className="h-1.5 flex-1 cursor-pointer accent-ember"
            aria-label="Zoom"
          />
        </label>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="cursor-pointer text-sm font-medium text-muted transition-colors hover:text-ink disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy || !img}
            className="cursor-pointer rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
