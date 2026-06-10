"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@/components/social/avatar";
import {
  sendAnnouncement,
  setUserAdmin,
  type DevUser,
} from "@/app/app/dev/actions";

const inputCls =
  "w-full rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint focus:border-ember focus:outline-none";

export default function DevPanelClient({ users }: { users: DevUser[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Announcement form
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [href, setHref] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function broadcast() {
    setResult(null);
    setError(null);
    startTransition(async () => {
      const res = await sendAnnouncement({ title, body, href });
      if (res.error) setError(res.error);
      else {
        setResult(`Sent to ${res.sent ?? 0} member${res.sent === 1 ? "" : "s"}.`);
        setTitle("");
        setBody("");
        setHref("");
      }
    });
  }

  function toggleAdmin(u: DevUser) {
    startTransition(async () => {
      const res = await setUserAdmin(u.id, !u.is_admin);
      if (res.error) setError(res.error);
      router.refresh();
    });
  }

  return (
    <>
      <div className="rounded-2xl border border-line bg-card p-5">
        <h2 className="mb-1 font-display text-lg text-ink">Send an announcement</h2>
        <p className="mb-3 text-xs text-muted">
          Lands in every member&rsquo;s notification bell.
        </p>
        <div className="space-y-2.5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title — e.g. New: Valorant RR tracker"
            maxLength={120}
            className={inputCls}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Optional details…"
            className={`${inputCls} resize-none`}
          />
          <input
            type="text"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="Optional in-app link — e.g. /app/gaming"
            className={inputCls}
            spellCheck={false}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          {result && <p className="text-sm text-ember">{result}</p>}
          <button
            type="button"
            onClick={broadcast}
            disabled={pending || !title.trim()}
            className="cursor-pointer rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send to everyone"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-lg text-ink">Members · {users.length}</h2>
        <ul className="divide-y divide-line">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-3 py-2.5">
              <Avatar
                profile={{ id: u.id, username: u.username, display_name: u.display_name, avatar_url: u.avatar_url, bio: null }}
                size={36}
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-medium text-ink">
                  {u.display_name || u.username || "Unnamed"}
                  {u.username && (
                    <Link href={`/app/u/${u.username}`} className="text-xs font-normal text-muted hover:text-ember">
                      @{u.username}
                    </Link>
                  )}
                  {u.is_admin && (
                    <span className="rounded-full bg-ember/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-ember">
                      Admin
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted">
                  Joined {new Date(u.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  {" · "}
                  {u.workouts} workouts · {u.meals} meals · {u.sessions} game sessions
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => toggleAdmin(u)}
                className="shrink-0 cursor-pointer rounded-full border border-line bg-paper-bright px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-ember hover:text-ember disabled:opacity-60"
              >
                {u.is_admin ? "Revoke admin" : "Make admin"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
