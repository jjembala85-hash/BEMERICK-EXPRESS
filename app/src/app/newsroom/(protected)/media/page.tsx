import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/session";
import { isStorageReady } from "@/lib/media";
import { formatEAT } from "@/lib/dates";
import { searchPhotos } from "@/lib/queries/media";
import { LibraryUpload } from "@/components/newsroom/photo-library";

export const metadata: Metadata = { title: "Photos" };

export default async function PhotoLibraryPage({ searchParams }: PageProps<"/newsroom/media">) {
  await requireStaff("media.upload");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const page = Math.min(1000, Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1));
  const { photos, hasMore } = await searchPhotos({ q, page });

  const pageHref = (n: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (n > 1) sp.set("page", String(n));
    const s = sp.toString();
    return `/newsroom/media${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <h1 className="font-serif text-3xl font-bold text-ink">Photos</h1>
      <p className="mt-1 text-slate">
        Every photo the newsroom has uploaded. Reuse one in a story from the editor&apos;s <span className="font-semibold">Choose from library</span> button.
      </p>
      {params.deleted === "1" && (
        <p role="status" className="mt-4 rounded-md bg-mist px-3 py-2 text-sm font-semibold text-lake-ink">Photo deleted.</p>
      )}

      <div className="mt-6">
        <LibraryUpload storageReady={isStorageReady()} />
      </div>

      <form action="/newsroom/media" role="search" className="mt-6 flex gap-2">
        <label htmlFor="photo-search" className="sr-only">Search photos</label>
        <input
          id="photo-search"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={100}
          placeholder="Search by description, credit or caption"
          className="w-full max-w-md rounded-md border border-mist bg-surface px-3 py-2.5 text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20"
        />
        <button type="submit" className="rounded-md border border-lake-ink px-4 py-2 font-semibold text-lake-ink hover:bg-mist">Search</button>
      </form>

      {photos.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-mist p-8 text-center text-slate">
          {q ? `No photos match “${q}”.` : "No photos yet. Upload the first one."}
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p) => (
            <li key={p.id}>
              <Link href={`/newsroom/media/${p.id}`} className="group block overflow-hidden rounded-lg border border-mist bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.previewUrl} alt={p.altText} loading="lazy" className="aspect-video w-full bg-mist object-cover" />
                <div className="p-2.5">
                  <p className="line-clamp-2 text-sm font-semibold text-ink group-hover:underline">{p.altText}</p>
                  <p className="mt-1 truncate text-xs text-slate">Photo: {p.credit}</p>
                  <p className="mt-0.5 text-xs text-slate">
                    {formatEAT(p.createdAt)} · {p.stories === 0 ? "Not used" : `In ${p.stories} ${p.stories === 1 ? "story" : "stories"}`}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {(page > 1 || hasMore) && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="font-semibold text-lake-ink hover:underline">← Newer</Link>
          ) : <span />}
          <span className="text-sm text-slate">Page {page}</span>
          {hasMore ? (
            <Link href={pageHref(page + 1)} className="font-semibold text-lake-ink hover:underline">Older →</Link>
          ) : <span />}
        </nav>
      )}
    </>
  );
}
