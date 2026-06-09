"use client";

import { useState, useTransition } from "react";
import {
  SECTIONS,
  VISIBILITY_OPTIONS,
  visibilityOf,
  type PrivacyMap,
  type SectionId,
  type Visibility,
} from "@/lib/social";
import { updateBio, updatePrivacy } from "@/app/app/friends/actions";

export default function PrivacySettings({
  bio: initialBio,
  privacy: initialPrivacy,
  hasUsername,
}: {
  bio: string;
  privacy: PrivacyMap;
  hasUsername: boolean;
}) {
  const [bio, setBio] = useState(initialBio);
  const [privacy, setPrivacy] = useState<PrivacyMap>(initialPrivacy);
  const [savedBio, setSavedBio] = useState(false);
  const [pending, startTransition] = useTransition();

  function saveBio() {
    setSavedBio(false);
    startTransition(async () => {
      await updateBio(bio);
      setSavedBio(true);
    });
  }

  function setVisibility(section: SectionId, v: Visibility) {
    const next = { ...privacy, [section]: v };
    setPrivacy(next);
    startTransition(() => {
      void updatePrivacy(next);
    });
  }

  return (
    <div className="space-y-6">
      {!hasUsername && (
        <p className="rounded-xl border border-line bg-paper-bright px-4 py-3 text-sm text-muted">
          Set a username in <span className="font-medium text-ink-soft">Account</span> so people can
          find you. Until then your profile isn&rsquo;t discoverable.
        </p>
      )}

      {/* Bio */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-soft">
          Bio <span className="text-faint">(shown on your profile)</span>
        </label>
        <textarea
          value={bio}
          onChange={(e) => {
            setBio(e.target.value);
            setSavedBio(false);
          }}
          rows={3}
          maxLength={280}
          placeholder="A line about you, your goals, what you play…"
          className="w-full resize-none rounded-xl border border-line bg-paper-bright px-4 py-3 text-[0.95rem] leading-relaxed text-ink placeholder:text-faint focus:border-ember focus:outline-none"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={saveBio}
            disabled={pending}
            className="cursor-pointer rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-60"
          >
            Save bio
          </button>
          {savedBio && <span className="text-sm text-ember">Saved.</span>}
          <span className="ml-auto text-xs text-faint">{bio.length}/280</span>
        </div>
      </div>

      {/* Per-section visibility */}
      <div>
        <p className="mb-1 text-sm font-medium text-ink-soft">What others can see</p>
        <p className="mb-3 text-xs text-muted">
          Everything is private by default. Journal photos are never shared —
          only entry text and mood, and only if you allow it.
        </p>
        <ul className="space-y-2">
          {SECTIONS.map((s) => {
            const current = visibilityOf(privacy, s.id);
            return (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper-bright px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{s.label}</p>
                  <p className="text-xs text-muted">{s.hint}</p>
                </div>
                <div className="flex shrink-0 overflow-hidden rounded-lg border border-line">
                  {VISIBILITY_OPTIONS.map((v) => {
                    const on = v.id === current;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={pending}
                        onClick={() => setVisibility(s.id, v.id)}
                        aria-pressed={on}
                        className={`cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                          on ? "bg-ink text-paper-bright" : "bg-paper-bright text-ink-soft hover:bg-paper"
                        }`}
                      >
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
