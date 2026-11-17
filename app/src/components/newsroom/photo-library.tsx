"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { deletePhoto, updatePhoto, type PhotoState } from "@/app/newsroom/(protected)/media/actions";
import { submitWithoutReset } from "@/lib/forms";
import { uploadPhoto } from "@/lib/photo-upload";

const inputClass =
  "w-full rounded-md border border-mist bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20";
const labelClass = "mb-1 block text-sm font-semibold text-ink";
const quietButton =
  "rounded-md border border-mist px-3 py-2 text-sm font-semibold text-ink hover:bg-mist disabled:opacity-60";

/** "Upload photo" panel at the top of the library. */
export function LibraryUpload({ storageReady }: { storageReady: boolean }) {
  const router = useRouter();
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  const [altText, setAltText] = useState("");
  const [credit, setCredit] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!picked) return;
    return () => URL.revokeObjectURL(picked.url);
  }, [picked]);

  function reset() {
    setPicked(null);
    setAltText("");
    setCredit("");
    setCaption("");
    setError(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      const photo = await uploadPhoto(picked.file, { altText, credit, caption });
      reset();
      setDone({ id: photo.id });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-mist bg-surface p-4">
      {!picked ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!storageReady}
            onClick={() => {
              setDone(null);
              fileInput.current?.click();
            }}
            className="rounded-md bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
          >
            Upload photo
          </button>
          <p className="text-sm text-slate">
            {storageReady
              ? "JPEG, PNG or WebP. It is resized automatically. Credit and description are required."
              : "Photo storage is not connected yet, so photos cannot be added."}
          </p>
        </div>
      ) : (
        <form onSubmit={upload} className="grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={picked.url} alt="" className="aspect-video w-full rounded-md bg-mist object-cover" />
          <div className="space-y-3">
            <div>
              <label htmlFor="up-alt" className={labelClass}>Description (alt text)</label>
              <input id="up-alt" value={altText} onChange={(e) => setAltText(e.target.value)} maxLength={300} placeholder="What the photo shows" className={inputClass} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="up-credit" className={labelClass}>Credit</label>
                <input id="up-credit" value={credit} onChange={(e) => setCredit(e.target.value)} maxLength={120} placeholder="Jane Namuli / BX News" className={inputClass} />
              </div>
              <div>
                <label htmlFor="up-caption" className={labelClass}>Caption (optional)</label>
                <input id="up-caption" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={300} className={inputClass} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className="rounded-md bg-lake-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
                {busy ? "Uploading…" : "Add to library"}
              </button>
              <button type="button" disabled={busy} onClick={reset} className={quietButton}>Cancel</button>
            </div>
          </div>
        </form>
      )}
      {error && <p role="alert" className="mt-3 rounded-md bg-ember/10 px-3 py-2 text-sm font-semibold text-ember">{error}</p>}
      {done && (
        <p role="status" className="mt-3 rounded-md bg-mist px-3 py-2 text-sm font-semibold text-lake-ink">
          Photo added.{" "}
          <Link href={`/newsroom/media/${done.id}`} className="underline">Open it</Link>
        </p>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setPicked({ file, url: URL.createObjectURL(file) });
        }}
      />
    </div>
  );
}

/** Edit form for one photo's credit, description, caption and licence. */
export function PhotoDetailsForm({
  mediaId,
  initial,
  editable,
}: {
  mediaId: string;
  initial: { altText: string; credit: string; caption: string; licence: string };
  editable: boolean;
}) {
  const [state, action, pending] = useActionState<PhotoState, FormData>(updatePhoto, {});
  return (
    <form onSubmit={submitWithoutReset(action)} className="space-y-3">
      <input type="hidden" name="mediaId" value={mediaId} />
      <fieldset disabled={!editable || pending} className="space-y-3">
        <div>
          <label htmlFor="ph-alt" className={labelClass}>Description (alt text)</label>
          <textarea id="ph-alt" name="altText" rows={2} required maxLength={300} defaultValue={initial.altText} className={inputClass} />
        </div>
        <div>
          <label htmlFor="ph-credit" className={labelClass}>Credit</label>
          <input id="ph-credit" name="credit" required maxLength={120} defaultValue={initial.credit} className={inputClass} />
        </div>
        <div>
          <label htmlFor="ph-caption" className={labelClass}>Caption (optional)</label>
          <textarea id="ph-caption" name="caption" rows={2} maxLength={300} defaultValue={initial.caption} className={inputClass} />
        </div>
        <div>
          <label htmlFor="ph-licence" className={labelClass}>Licence or permission (optional)</label>
          <input
            id="ph-licence"
            name="licence"
            maxLength={120}
            defaultValue={initial.licence}
            placeholder="e.g. Staff photo · Used with permission · Handout"
            className={inputClass}
          />
        </div>
      </fieldset>
      {state.error && <p role="alert" className="rounded-md bg-ember/10 px-3 py-2 text-sm font-semibold text-ember">{state.error}</p>}
      {state.message && <p role="status" className="rounded-md bg-mist px-3 py-2 text-sm font-semibold text-lake-ink">{state.message}</p>}
      {editable ? (
        <button type="submit" disabled={pending} className="rounded-md bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-deep disabled:opacity-60">
          {pending ? "Saving…" : "Save details"}
        </button>
      ) : (
        <p className="text-sm text-slate">Only the person who uploaded this photo, or an editor, can change its details.</p>
      )}
    </form>
  );
}

export function DeletePhotoButton({ mediaId }: { mediaId: string }) {
  const [state, action, pending] = useActionState<PhotoState, FormData>(deletePhoto, {});
  return (
    <form
      onSubmit={(e) => {
        if (!window.confirm("Delete this photo for good? This cannot be undone.")) {
          e.preventDefault();
          return;
        }
        submitWithoutReset(action)(e);
      }}
    >
      <input type="hidden" name="mediaId" value={mediaId} />
      <button type="submit" disabled={pending} className="rounded-md border border-ember px-4 py-2 text-sm font-semibold text-ember hover:bg-ember/10 disabled:opacity-60">
        {pending ? "Deleting…" : "Delete photo"}
      </button>
      {state.error && <p role="alert" className="mt-2 text-sm font-semibold text-ember">{state.error}</p>}
    </form>
  );
}
