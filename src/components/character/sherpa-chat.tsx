"use client";

import { useRef, useState } from "react";
import Link from "next/link";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "What should I focus on this week?",
  "Why is my Focus stronger than my Discipline?",
  "Give me one small win for today.",
];

export default function SherpaChat({
  configured,
  pro = true,
  freeLimit = 0,
}: {
  configured: boolean;
  pro?: boolean;
  freeLimit?: number;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [walled, setWalled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!configured) return <Dormant />;

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/sherpa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (res.status === 402) {
        setWalled(true); // free daily taste used up
        return;
      }
      if (!res.ok || !res.body) {
        setMessages((m) => [...m, { role: "assistant", content: "The mountain's quiet — I couldn't reach you just now. Try again in a moment." }]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="u-rise rounded-2xl border border-line bg-card p-6">
      <div className="flex items-center gap-2.5">
        <Sigil />
        <div>
          <h3 className="font-display text-lg text-ink">Talk to the Sherpa</h3>
          <p className="text-xs text-muted">Ask your guide anything about your climb.</p>
        </div>
      </div>

      {!pro && !walled && (
        <p className="mt-3 text-xs text-faint">
          Free preview · {freeLimit} message{freeLimit === 1 ? "" : "s"} a day.{" "}
          <Link href="/app/upgrade" className="font-medium text-ember hover:underline">
            Upgrade for unlimited
          </Link>
        </p>
      )}

      {messages.length === 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {STARTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="cursor-pointer rounded-full border border-line bg-paper-bright px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-ember/50"
            >
              {s}
            </button>
          ))}
        </div>
      ) : (
        <div ref={scrollRef} className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-ember/15 text-ink"
                    : "border border-line bg-paper-bright text-ink-soft"
                }`}
              >
                {m.content || <span className="text-faint">…</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {walled ? (
        <div className="mt-4 rounded-2xl border border-ember/40 bg-ember/5 p-4 text-center">
          <p className="text-sm font-medium text-ink">That’s today’s free preview.</p>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted">
            Upgrade to Upward Pro for unlimited conversations with your Sherpa — or come back
            tomorrow for {freeLimit} more.
          </p>
          <Link
            href="/app/upgrade"
            className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-ember px-5 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
          >
            Upgrade for unlimited
          </Link>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="mt-4 flex items-center gap-2"
        >
          <label htmlFor="sherpa-input" className="sr-only">
            Message the Sherpa
          </label>
          <input
            id="sherpa-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the Sherpa…"
            disabled={sending}
            className="min-w-0 flex-1 rounded-full border border-line bg-paper-bright px-4 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-ember/60 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-ember text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </form>
      )}
    </div>
  );
}

function Dormant() {
  return (
    <div className="u-rise u-glow-border rounded-2xl border border-line bg-card p-6">
      <div className="flex items-start gap-4">
        <Sigil />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg text-ink">Talk to the Sherpa</h3>
            <span className="rounded-full bg-ember/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-ember">
              Pro · soon
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Conversation with your guide is on the way — ask the Sherpa anything about your climb and
            get coaching grounded in your real character. Coming as part of Upward Pro.
          </p>
        </div>
      </div>
    </div>
  );
}

function Sigil() {
  return (
    <div className="grid size-11 shrink-0 place-items-center rounded-full border border-ember/40 bg-ember/10">
      <svg width="24" height="24" viewBox="0 0 48 48" fill="none" aria-hidden>
        <path d="M7 37 L19 17 L26 27 L31 20 L41 37 Z" fill="var(--color-ember)" fillOpacity="0.18" stroke="var(--color-ember)" strokeWidth="2" strokeLinejoin="round" />
        <path d="M19 17 V9" stroke="var(--color-ember)" strokeWidth="2" strokeLinecap="round" />
        <path d="M19 9 L27 11 L19 13 Z" fill="var(--color-ember)" />
      </svg>
    </div>
  );
}
