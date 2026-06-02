"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { POPULAR_GAMES, monogram, tileColor } from "@/lib/gaming";
import { addGame } from "@/app/app/gaming/actions";

export default function AddGame() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [custom, setCustom] = useState(false);
  const [trackerUrl, setTrackerUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pick(g: { slug: string; name: string }) {
    setCustom(false);
    setSlug(g.slug);
    setName(g.name);
    setError(null);
  }

  function submit() {
    setError(null);
    const finalName = custom ? name.trim() : name;
    if (!finalName) {
      setError("Choose a game or enter a custom name.");
      return;
    }
    startTransition(async () => {
      const res = await addGame({
        name: finalName,
        slug: custom ? undefined : slug,
        trackerUrl,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.id) router.push(`/app/gaming/${res.id}`);
    });
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {POPULAR_GAMES.map((g) => {
          const active = !custom && slug === g.slug;
          return (
            <button
              key={g.slug}
              type="button"
              onClick={() => pick(g)}
              aria-pressed={active}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors duration-200 ${
                active
                  ? "border-ember bg-ember-wash"
                  : "border-line bg-paper-bright hover:border-line-strong"
              }`}
            >
              <span
                className="grid size-9 shrink-0 place-items-center rounded-lg text-sm font-semibold text-paper-bright"
                style={{ backgroundColor: tileColor(g.slug) }}
              >
                {monogram(g.name)}
              </span>
              <span className="truncate text-sm font-medium text-ink">
                {g.name}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setCustom(true);
            setSlug("");
            setName("");
          }}
          aria-pressed={custom}
          className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-3 text-left transition-colors duration-200 ${
            custom
              ? "border-ember bg-ember-wash"
              : "border-line-strong bg-paper-bright hover:border-ember"
          }`}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ink text-lg text-paper-bright">
            +
          </span>
          <span className="text-sm font-medium text-ink">Other game</span>
        </button>
      </div>

      {custom && (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Game name"
          className="mt-3 w-full rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none"
        />
      )}

      <label className="mt-3 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-soft">
          Tracker link <span className="text-faint">(optional)</span>
        </span>
        <input
          type="url"
          value={trackerUrl}
          onChange={(e) => setTrackerUrl(e.target.value)}
          placeholder="https://tracker.gg/valorant/profile/…"
          className="w-full rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint transition-colors focus:border-ember focus:outline-none"
        />
      </label>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-paper-bright shadow-[0_2px_8px_rgba(34,31,26,0.16)] transition-all duration-200 hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Adding…" : "Add game"}
      </button>
    </div>
  );
}
