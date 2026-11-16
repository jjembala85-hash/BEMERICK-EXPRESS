"use client";

import { useEffect, useRef, useState } from "react";

export type LeadPhotoValue = {
  id: string;
  previewUrl: string;
  altText: string;
  credit: string;
  caption: string | null;
};

// Keep in step with PHOTO_WIDTHS in src/lib/media.ts.
const WIDTHS = [480, 960, 1600];
const MIN_WIDTH = 480;

const inputClass =
  "w-full rounded-md border border-mist bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20";
const labelClass = "mb-1 block text-sm font-semibold text-ink";
const quietButton =
  "rounded-md border border-mist px-3 py-2 text-sm font-semibold text-ink hover:bg-mist disabled:opacity-60";

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Shrinks the photo in the browser so a phone on mobile data uploads kilobytes, not megabytes. */
async function resize(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    if (bitmap.width < MIN_WIDTH) {
      throw new Error(`This photo is too small (${bitmap.width} pixels wide). Use one at least ${MIN_WIDTH} pixels wide.`);
    }
    const widths = [...new Set(WIDTHS.map((w) => Math.min(w, bitmap.width)))];
    const blobs: Blob[] = [];
    for (const width of widths) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = Math.round((bitmap.height * width) / bitmap.width);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("This browser cannot prepare photos. Try Chrome.");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      // WebP is smaller; browsers that cannot make it (Safari) fall back to JPEG.
      let blob = await toBlob(canvas, "image/webp", 0.8);
      if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", 0.82);
      if (!blob) throw new Error("The photo could not be prepared. Try a different one.");
      blobs.push(blob);
    }
    return blobs;
  } finally {
    bitmap.close();
  }
}

export function LeadPhoto({ initial, storageReady }: { initial?: LeadPhotoValue | null; storageReady: boolean }) {
  const [photo, setPhoto] = useState<LeadPhotoValue | null>(initial ?? null);
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  const [altText, setAltText] = useState("");
  const [credit, setCredit] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Free the temporary preview when it is replaced or the editor closes.
  useEffect(() => {
    if (!picked) return;
    return () => URL.revokeObjectURL(picked.url);
  }, [picked]);

  function choose(file: File | undefined) {
    setError(null);
    if (!file) return;
    setPicked({ file, url: URL.createObjectURL(file) });
  }

  function cancel() {
    setPicked(null);
    setError(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function upload() {
    if (!picked) return;
    if (!altText.trim()) return setError("Describe the photo for readers who cannot see it.");
    if (!credit.trim()) return setError("Add the photo credit. Every photo must be credited.");
    setBusy(true);
    setError(null);
    try {
      let blobs: Blob[];
      try {
        blobs = await resize(picked.file);
      } catch (e) {
        throw e instanceof Error && e.message.startsWith("This")
          ? e
          : new Error("This file could not be opened as a photo. Use a JPEG, PNG or WebP.");
      }
      const form = new FormData();
      for (const blob of blobs) form.append("file", blob);
      form.append("altText", altText);
      form.append("credit", credit);
      form.append("caption", caption);
      const res = await fetch("/api/newsroom/media", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) throw new Error(data?.error ?? "The upload failed. Check your connection and try again.");
      setPhoto(data as LeadPhotoValue);
      setAltText("");
      setCredit("");
      setCaption("");
      cancel();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  // Enter inside these fields must not submit the whole story.
  const noSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.preventDefault();
  };

  return (
    <div className="rounded-lg border border-mist bg-surface p-4">
      <p className={labelClass}>Lead photo</p>
      <input type="hidden" name="leadMediaId" value={photo?.id ?? ""} />

      {photo && !picked && (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.previewUrl} alt={photo.altText} className="aspect-video w-full rounded-md bg-mist object-cover" />
          {photo.caption && <p className="mt-2 text-sm text-ink">{photo.caption}</p>}
          <p className="mt-1 text-xs text-slate">Photo: {photo.credit}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={quietButton} onClick={() => fileInput.current?.click()}>
              Replace
            </button>
            <button type="button" className={quietButton} onClick={() => setPhoto(null)}>
              Remove
            </button>
          </div>
          <p className="mt-2 text-xs text-slate">Save the story to keep photo changes.</p>
        </div>
      )}

      {!photo && !picked && (
        <div>
          <button
            type="button"
            className={`${quietButton} w-full`}
            disabled={!storageReady}
            onClick={() => fileInput.current?.click()}
          >
            Choose photo
          </button>
          <p className="mt-2 text-xs text-slate">
            {storageReady
              ? "A wide (landscape) photo works best. It is resized automatically."
              : "Photo storage is not connected yet, so photos cannot be added."}
          </p>
        </div>
      )}

      {picked && (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={picked.url} alt="" className="aspect-video w-full rounded-md bg-mist object-cover" />
          <div>
            <label htmlFor="photo-alt" className={labelClass}>Description (alt text)</label>
            <input
              id="photo-alt"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              onKeyDown={noSubmit}
              maxLength={300}
              placeholder="What the photo shows"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="photo-credit" className={labelClass}>Credit</label>
            <input
              id="photo-credit"
              value={credit}
              onChange={(e) => setCredit(e.target.value)}
              onKeyDown={noSubmit}
              maxLength={120}
              placeholder="Jane Namuli / BX News"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="photo-caption" className={labelClass}>Caption (optional)</label>
            <input
              id="photo-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={noSubmit}
              maxLength={300}
              className={inputClass}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={upload}
              className="rounded-md bg-lake-ink px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Uploading…" : "Upload photo"}
            </button>
            <button type="button" className={quietButton} disabled={busy} onClick={cancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-md bg-ember/10 px-3 py-2 text-sm font-semibold text-ember">
          {error}
        </p>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => choose(e.target.files?.[0])}
      />
    </div>
  );
}
