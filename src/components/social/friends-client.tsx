"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "./avatar";
import DashboardCard from "@/components/dashboard/card";
import { profileName, type PublicProfile } from "@/lib/social";
import {
  searchUsers,
  sendFriendRequest,
  respondToRequest,
  removeFriend,
  type UserResult,
} from "@/app/app/friends/actions";

type Item = { friendshipId: string; profile: PublicProfile };

const pill =
  "cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-60";

export default function FriendsClient({
  friends,
  incoming,
  outgoing,
}: {
  friends: Item[];
  incoming: Item[];
  outgoing: Item[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searched, setSearched] = useState(false);

  function runSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    startTransition(async () => {
      setResults(await searchUsers(q));
      setSearched(true);
    });
  }

  function act(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      if (query.trim().length >= 2) setResults(await searchUsers(query.trim()));
      router.refresh();
    });
  }

  return (
    <>
      {/* Search */}
      <DashboardCard title="Find people">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Search by username…"
            spellCheck={false}
            className="flex-1 rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint focus:border-ember focus:outline-none"
          />
          <button
            type="button"
            onClick={runSearch}
            disabled={pending || query.trim().length < 2}
            className={`${pill} bg-ink text-paper-bright hover:bg-ink-soft`}
          >
            Search
          </button>
        </div>

        {searched && results.length === 0 && (
          <p className="mt-3 text-sm text-muted">No members found for &ldquo;{query.trim()}&rdquo;.</p>
        )}
        {results.length > 0 && (
          <ul className="mt-3 space-y-2">
            {results.map((u) => (
              <Row key={u.id} profile={u}>
                {u.status === "friend" ? (
                  <span className="text-sm font-medium text-ember">Friends</span>
                ) : u.status === "outgoing" ? (
                  <span className="text-sm text-muted">Requested</span>
                ) : u.status === "incoming" ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => act(() => sendFriendRequest(u.id))}
                    className={`${pill} bg-ink text-paper-bright hover:bg-ink-soft`}
                  >
                    Accept
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => act(() => sendFriendRequest(u.id))}
                    className={`${pill} border border-line bg-paper-bright text-ink-soft hover:border-ember hover:text-ember`}
                  >
                    Add friend
                  </button>
                )}
              </Row>
            ))}
          </ul>
        )}
      </DashboardCard>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <DashboardCard title={`Requests · ${incoming.length}`}>
          <ul className="space-y-2">
            {incoming.map((it) => (
              <Row key={it.friendshipId} profile={it.profile}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => act(() => respondToRequest(it.friendshipId, true))}
                    className={`${pill} bg-ink text-paper-bright hover:bg-ink-soft`}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => act(() => respondToRequest(it.friendshipId, false))}
                    className={`${pill} text-muted hover:text-danger`}
                  >
                    Decline
                  </button>
                </div>
              </Row>
            ))}
          </ul>
        </DashboardCard>
      )}

      {/* Friends */}
      <DashboardCard title={`Friends · ${friends.length}`}>
        {friends.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            No friends yet — search above to connect with people.
          </p>
        ) : (
          <ul className="space-y-2">
            {friends.map((it) => (
              <Row key={it.friendshipId} profile={it.profile}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => act(() => removeFriend(it.profile.id))}
                  className={`${pill} text-muted hover:text-danger`}
                >
                  Remove
                </button>
              </Row>
            ))}
          </ul>
        )}
      </DashboardCard>

      {/* Sent */}
      {outgoing.length > 0 && (
        <DashboardCard title={`Sent · ${outgoing.length}`}>
          <ul className="space-y-2">
            {outgoing.map((it) => (
              <Row key={it.friendshipId} profile={it.profile}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => act(() => removeFriend(it.profile.id))}
                  className={`${pill} text-muted hover:text-danger`}
                >
                  Cancel
                </button>
              </Row>
            ))}
          </ul>
        </DashboardCard>
      )}
    </>
  );
}

function Row({ profile, children }: { profile: PublicProfile; children: React.ReactNode }) {
  const name = profileName(profile);
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper-bright px-3 py-2.5">
      <Link
        href={profile.username ? `/app/u/${profile.username}` : "#"}
        className="flex min-w-0 items-center gap-3"
      >
        <Avatar profile={profile} size={40} />
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{name}</p>
          {profile.username && <p className="truncate text-xs text-muted">@{profile.username}</p>}
        </div>
      </Link>
      <div className="shrink-0">{children}</div>
    </li>
  );
}
