"use client";

import { useEffect, useState } from "react";
import {
  savePushSubscription,
  deletePushSubscription,
  sendTestNotification,
} from "@/app/app/push/actions";

type Status = "loading" | "unsupported" | "denied" | "off" | "on";

function base64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Enable/disable push notifications for THIS device. */
export default function PushSettings({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (
        !vapidPublicKey ||
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setStatus(sub ? "on" : "off");
      } catch {
        if (!cancelled) setStatus("off");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vapidPublicKey]);

  async function enable() {
    if (!vapidPublicKey) return;
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
      });
      const json = sub.toJSON();
      const res = await savePushSubscription({
        endpoint: sub.endpoint,
        keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
      });
      if (res.error) {
        setError(res.error);
        await sub.unsubscribe();
        setStatus("off");
        return;
      }
      setStatus("on");
    } catch {
      setError("Couldn't enable notifications on this device.");
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setTestMsg(null);
    try {
      const r = await sendTestNotification();
      setTestMsg(
        r.error
          ? r.error
          : `Sent to ${r.sent} device${r.sent === 1 ? "" : "s"} — check your phone in a moment.`,
      );
    } catch {
      setTestMsg("Couldn't send the test. Try again.");
    } finally {
      setTesting(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch {
      setError("Couldn't disable. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-muted">
        Get your morning brief, supplement reminders, a streak-at-risk nudge and
        your weekly summary as real notifications on this device.
      </p>

      {status === "loading" && <p className="text-sm text-faint">Checking this device…</p>}

      {status === "unsupported" && (
        <p className="text-sm text-muted">
          {vapidPublicKey
            ? "This browser doesn't support push notifications. On iPhone, install Upward to your home screen first (Share → Add to Home Screen)."
            : "Push isn't configured on the server yet (missing VAPID keys)."}
        </p>
      )}

      {status === "denied" && (
        <p className="text-sm text-muted">
          Notifications are blocked for this site. Allow them in your browser&rsquo;s
          site settings, then come back here.
        </p>
      )}

      {(status === "off" || status === "on") && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={status === "on" ? disable : enable}
            className={`cursor-pointer rounded-full px-5 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
              status === "on"
                ? "border border-line bg-paper-bright text-ink-soft hover:border-line-strong hover:text-ink"
                : "bg-ink text-paper-bright hover:bg-ink-soft"
            }`}
          >
            {busy
              ? "Working…"
              : status === "on"
                ? "Disable on this device"
                : "Enable notifications"}
          </button>
          {status === "on" && (
            <>
              <button
                type="button"
                disabled={testing}
                onClick={sendTest}
                className="cursor-pointer rounded-full border border-line bg-paper-bright px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-ember/50 hover:text-ink disabled:opacity-60"
              >
                {testing ? "Sending…" : "Send a test"}
              </button>
              <span className="inline-flex items-center gap-1.5 text-sm text-ember">
                <span className="inline-block size-2 rounded-full bg-ember" />
                Active on this device
              </span>
            </>
          )}
        </div>
      )}

      {testMsg && status === "on" && <p className="text-sm text-ink-soft">{testMsg}</p>}

      {/* Why you might not be seeing them — the scheduled reminders only fire at
          set local hours, so a test is the quickest way to confirm delivery. */}
      {status === "on" && (
        <p className="text-xs leading-relaxed text-faint">
          Reminders fire at set local times — your brief at 9am, supplements at their timing
          windows, a streak nudge at 9pm, and a Sunday-evening summary. Use “Send a test” to
          confirm delivery any time.
        </p>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      <p className="text-xs leading-relaxed text-faint">
        Per-device: enable it on your phone and your computer separately. iPhone
        requires the app installed to the home screen (iOS 16.4+).
      </p>
    </div>
  );
}
