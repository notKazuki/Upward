"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/icons";

// Minimal typing for the Web Speech API (absent from lib.dom on some targets).
type SpeechRecognitionResultLike = { isFinal: boolean; 0: { transcript: string } };
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};
type SRWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

// A speak-or-type capture box. Speech (Web Speech API — free, browser-native)
// is offered when supported; the textarea is always there as the fallback, so
// it never hard-fails. Controlled: the parent owns the text (reset by remount).
export default function VoiceCapture({
  value,
  onChange,
  placeholder = "Tell me what you did today…",
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}) {
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const valueRef = useRef(value);

  // Keep the latest value reachable from the recognition callback closure.
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    const w = window as SRWindow;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only capability detection; must run post-mount to avoid an SSR hydration mismatch
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => recRef.current?.stop();
  }, []);

  function toggle() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const w = window as SRWindow;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalChunk += r[0].transcript;
        else interimChunk += r[0].transcript;
      }
      if (finalChunk) {
        const base = valueRef.current ? valueRef.current.trimEnd() + " " : "";
        onChange(base + finalChunk.trim());
      }
      setInterim(interimChunk);
    };
    rec.onerror = () => {
      setListening(false);
      setInterim("");
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={5}
          aria-label="What you did today"
          className="w-full resize-none rounded-2xl border border-line bg-paper-bright p-4 pr-16 text-base leading-relaxed text-ink placeholder:text-faint focus:border-ember/50 focus:outline-none"
        />
        {supported && (
          <button
            type="button"
            onClick={toggle}
            aria-label={listening ? "Stop recording" : "Start recording"}
            aria-pressed={listening}
            className={`absolute right-3 top-3 grid size-11 cursor-pointer place-items-center rounded-full border transition-colors ${
              listening
                ? "border-transparent bg-ember text-paper"
                : "border-line bg-card text-ink-soft hover:border-ember/50 hover:text-ember"
            }`}
          >
            {listening && (
              <span className="absolute inset-0 animate-ping rounded-full bg-ember/40" aria-hidden />
            )}
            <Icon name="mic" size={18} />
          </button>
        )}
      </div>

      {listening && interim && <p className="px-1 text-sm italic text-muted">{interim}</p>}

      <p className="px-1 text-xs leading-relaxed text-faint">
        {supported
          ? listening
            ? "Listening… tap the mic again when you’re done."
            : "Tap the mic and talk, or just type. Speak naturally — “benched, ate a chicken bowl, won 2 ranked.”"
          : "Type what you did today. (Voice input isn’t supported here — on iPhone, open Upward from your home screen.)"}
      </p>
    </div>
  );
}
