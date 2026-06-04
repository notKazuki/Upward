"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Relationship } from "@/lib/social";
import {
  sendFriendRequest,
  removeFriend,
  blockUser,
  unblockUser,
} from "@/app/app/friends/actions";

const solid = "cursor-pointer rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-60";
const ghost = "cursor-pointer rounded-full border border-line bg-paper-bright px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink disabled:opacity-60";
const danger = "cursor-pointer text-sm font-medium text-muted transition-colors hover:text-danger disabled:opacity-60";

export default function ProfileActions({
  targetId,
  rel,
  outgoingPending,
  incomingPending,
  viewerBlockedTarget,
}: {
  targetId: string;
  rel: Relationship;
  outgoingPending: boolean;
  incomingPending: boolean;
  viewerBlockedTarget: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmBlock, setConfirmBlock] = useState(false);

  function act(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      setConfirmBlock(false);
      router.refresh();
    });
  }

  if (rel === "self") {
    return (
      <Link href="/app/settings" className={ghost}>
        Edit sharing
      </Link>
    );
  }

  if (viewerBlockedTarget) {
    return (
      <button type="button" disabled={pending} onClick={() => act(() => unblockUser(targetId))} className={ghost}>
        Unblock
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {rel === "friend" ? (
        <button type="button" disabled={pending} onClick={() => act(() => removeFriend(targetId))} className={ghost}>
          Friends ✓
        </button>
      ) : incomingPending ? (
        <button type="button" disabled={pending} onClick={() => act(() => sendFriendRequest(targetId))} className={solid}>
          Accept request
        </button>
      ) : outgoingPending ? (
        <button type="button" disabled={pending} onClick={() => act(() => removeFriend(targetId))} className={ghost}>
          Requested · cancel
        </button>
      ) : (
        <button type="button" disabled={pending} onClick={() => act(() => sendFriendRequest(targetId))} className={solid}>
          Add friend
        </button>
      )}

      {confirmBlock ? (
        <span className="flex items-center gap-2 text-sm">
          <span className="text-muted">Block?</span>
          <button type="button" disabled={pending} onClick={() => act(() => blockUser(targetId))} className="cursor-pointer font-medium text-danger hover:underline">
            Yes
          </button>
          <button type="button" onClick={() => setConfirmBlock(false)} className="cursor-pointer text-muted hover:text-ink">
            No
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setConfirmBlock(true)} className={danger}>
          Block
        </button>
      )}
    </div>
  );
}
