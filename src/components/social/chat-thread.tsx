"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage, markRead } from "@/app/app/chat/actions";
import { dayLabel, timeLabel, type Message } from "@/lib/chat";

export default function ChatThread({
  meId,
  otherId,
  otherName,
  initial,
}: {
  meId: string;
  otherId: string;
  otherName: string;
  initial: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Live delivery: subscribe to messages addressed to me from this friend.
  useEffect(() => {
    void markRead(otherId);
    const supabase = createClient();
    const channel = supabase
      .channel(`dm:${otherId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${meId}` },
        (payload) => {
          const m = payload.new as Message;
          if (m.sender_id !== otherId) return;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          void markRead(otherId);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [meId, otherId]);

  // Keep pinned to the latest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  function send() {
    const body = text.trim();
    if (!body) return;
    setError(null);
    setText("");
    startTransition(async () => {
      const res = await sendMessage(otherId, body);
      if (res.error) {
        setError(res.error);
        setText(body); // restore so it isn't lost
        return;
      }
      if (res.message) {
        setMessages((prev) =>
          prev.some((x) => x.id === res.message!.id) ? prev : [...prev, res.message!],
        );
      }
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-line bg-card">
      {/* Messages */}
      <div className="flex-1 space-y-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <p className="max-w-xs text-sm text-muted">
              No messages yet — say hello to {otherName}.
            </p>
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.sender_id === meId;
            const showDay =
              i === 0 || dayLabel(messages[i - 1].created_at) !== dayLabel(m.created_at);
            return (
              <div key={m.id}>
                {showDay && (
                  <div className="my-3 text-center text-xs font-medium text-faint">
                    {dayLabel(m.created_at)}
                  </div>
                )}
                <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      mine
                        ? "rounded-br-md bg-ink text-paper-bright"
                        : "rounded-bl-md bg-paper-bright text-ink"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={`mt-0.5 text-[0.65rem] ${mine ? "text-paper-bright/60" : "text-faint"}`}>
                      {timeLabel(m.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-line p-3">
        {error && <p className="mb-2 px-1 text-xs text-danger">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={`Message ${otherName}…`}
            className="max-h-32 flex-1 resize-none rounded-xl border border-line bg-paper-bright px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-faint focus:border-ember focus:outline-none"
          />
          <button
            type="button"
            onClick={send}
            disabled={pending || !text.trim()}
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl bg-ink text-paper-bright transition-colors hover:bg-ink-soft disabled:opacity-60"
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
