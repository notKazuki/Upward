"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateAvatar } from "@/app/app/account/actions";
import ImageCropper from "./image-cropper";

export default function AvatarUploader({
  userId,
  currentUrl,
  initials,
}: {
  userId: string;
  currentUrl: string | null;
  initials: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ src: string; type: string } | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image must be under 8 MB.");
      return;
    }
    // Open the cropper; upload happens after the user confirms a square crop.
    setCrop({ src: URL.createObjectURL(file), type: file.type });
  }

  async function uploadBlob(blob: Blob) {
    setCrop(null);
    setBusy(true);
    setPreview(URL.createObjectURL(blob)); // optimistic

    const supabase = createClient();
    const ext = blob.type === "image/png" ? "png" : "jpg";
    const path = `${userId}/avatar.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: blob.type });

    if (upErr) {
      setError("Upload failed. Make sure you've run supabase/profile.sql.");
      setBusy(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${data.publicUrl}?v=${Date.now()}`; // cache-bust

    const res = await updateAvatar(url);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setPreview(url);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Your avatar"
            className="size-20 rounded-full object-cover ring-1 ring-line"
          />
        ) : (
          <div className="grid size-20 place-items-center rounded-full bg-ink text-2xl font-semibold text-paper-bright">
            {initials}
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center rounded-full bg-black/40">
            <span className="size-5 animate-spin rounded-full border-2 border-paper-bright border-t-transparent" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="cursor-pointer rounded-xl border border-line bg-paper-bright px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink disabled:opacity-60"
        >
          {busy ? "Uploading…" : "Change photo"}
        </button>
        <p className="text-xs text-faint">JPG or PNG — you&rsquo;ll crop it to a square.</p>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>

      {crop && (
        <ImageCropper
          src={crop.src}
          fileType={crop.type}
          onCancel={() => setCrop(null)}
          onCropped={uploadBlob}
        />
      )}
    </div>
  );
}
