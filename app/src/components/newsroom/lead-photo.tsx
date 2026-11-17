"use client";

import { useEffect, useRef, useState } from "react";
import { uploadPhoto, type PickedPhoto } from "@/lib/photo-upload";

export type LeadPhotoValue = PickedPhoto;

const inputClass =
  "w-full rounded-md border border-mist bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20";
const labelClass = "mb-1 block text-sm font-semibold text-ink";
const quietButton =
  "rounded-md border border-mist px-3 py-2 text-sm font-semibold text-ink hover:bg-mist disabled:opacity-60";

// Enter inside these fields must not submit the whole story.
const noSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter") e.preventDefault();
};

/** Lists library photos so a story can reuse one instead of uploading it again. */
function LibraryPicker({ onPick, onClose }: { onPick: (photo: PickedPhoto) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/newsroom/media?${new URLSearchParams({ q: search, page: String(page) })}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.photos) throw new Error(data?.error ?? "The photos could not be loaded. Try again.");
        setPhotos((before) => (page === 1 ? data.photos : [...before, ...data.photos]));
        setHasMore(Boolean(data.hasMore));
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "The photos could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [search, page]);

  function load(nextSearch: string, nextPage: number) {
    if (nextSearch === search && nextPage === page) return;
    setLoading(true);
    setError(null);
    setSearch(nextSearch);
    setPage(nextPage);
  }

  const runSearch = () => load(query.trim(), 1);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <label htmlFor="library-search" className="sr-only">Search photos</label>
        <input
          id="library-search"
          type="search"
          value={query}
          maxLength={100}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch();
            }
          }}
          placeholder="Search description or credit"
          className={inputClass}
        />
        <button type="button" className={quietButton} onClick={runSearch}>Search</button>
      </div>
      {photos.length > 0 && (
        <ul className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto pr-1">
          {photos.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPick(p)}
                className="block w-full overflow-hidden rounded-md border border-mist text-left hover:border-lake-ink focus:outline-none focus:ring-2 focus:ring-lake-ink"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.previewUrl} alt={p.altText} loading="lazy" className="aspect-video w-full bg-mist object-cover" />
                <span className="block truncate px-1.5 py-1 text-xs text-slate">{p.credit}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!loading && !error && photos.length === 0 && (
        <p className="text-sm text-slate">{search ? `No photos match “${search}”.` : "The library is empty. Upload a photo instead."}</p>
      )}
      {loading && <p className="text-sm text-slate">Loading photos…</p>}
      {error && <p role="alert" className="text-sm font-semibold text-ember">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {hasMore && !loading && (
          <button type="button" className={quietButton} onClick={() => load(search, page + 1)}>Show more</button>
        )}
        <button type="button" className={quietButton} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

export function LeadPhoto({ initial, storageReady }: { initial?: LeadPhotoValue | null; storageReady: boolean }) {
  const [photo, setPhoto] = useState<LeadPhotoValue | null>(initial ?? null);
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  const [browsing, setBrowsing] = useState(false);
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
    setBrowsing(false);
    setPicked({ file, url: URL.createObjectURL(file) });
  }

  function cancel() {
    setPicked(null);
    setError(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function upload() {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      setPhoto(await uploadPhoto(picked.file, { altText, credit, caption }));
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

  const pickButtons = (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={quietButton} disabled={!storageReady} onClick={() => fileInput.current?.click()}>
        {photo ? "Upload new" : "Upload photo"}
      </button>
      <button type="button" className={quietButton} onClick={() => setBrowsing(true)}>
        Choose from library
      </button>
      {photo && (
        <button type="button" className={quietButton} onClick={() => setPhoto(null)}>
          Remove
        </button>
      )}
    </div>
  );

  return (
    <div className="rounded-lg border border-mist bg-surface p-4">
      <p className={labelClass}>Lead photo</p>
      <input type="hidden" name="leadMediaId" value={photo?.id ?? ""} />

      {browsing && !picked && (
        <LibraryPicker
          onClose={() => setBrowsing(false)}
          onPick={(p) => {
            setPhoto(p);
            setBrowsing(false);
            setError(null);
          }}
        />
      )}

      {photo && !picked && !browsing && (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.previewUrl} alt={photo.altText} className="aspect-video w-full rounded-md bg-mist object-cover" />
          {photo.caption && <p className="mt-2 text-sm text-ink">{photo.caption}</p>}
          <p className="mt-1 text-xs text-slate">Photo: {photo.credit}</p>
          <div className="mt-3">{pickButtons}</div>
          <p className="mt-2 text-xs text-slate">Save the story to keep photo changes.</p>
        </div>
      )}

      {!photo && !picked && !browsing && (
        <div>
          {pickButtons}
          <p className="mt-2 text-xs text-slate">
            {storageReady
              ? "A wide (landscape) photo works best. It is resized automatically."
              : "Photo storage is not connected yet, so new photos cannot be uploaded."}
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
