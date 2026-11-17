import Link from "next/link";
import type { StoryCard } from "@/lib/queries/public";
import { formatEAT } from "@/lib/dates";
import { PhotoFrame } from "@/components/photo";

/** Video bulletins as cards with a play mark. Posters are our own photos, never YouTube thumbnails. */
export function BulletinGrid({ stories }: { stories: StoryCard[] }) {
  return (
    <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {stories.map((s) => (
        <li key={s.id}>
          <Link href={`/${s.sectionSlug}/${s.slug}`} className="group block">
            <span className="relative block overflow-hidden rounded-md">
              {s.photo ? (
                <PhotoFrame photo={s.photo} sizes="(min-width: 64rem) 20rem, (min-width: 40rem) 50vw, 100vw" />
              ) : (
                <span aria-hidden className="flex aspect-video w-full items-center justify-center bg-brand">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/bx-mark-reverse.svg" alt="" className="size-14 opacity-30" />
                </span>
              )}
              <span aria-hidden className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/70 px-2 py-0.5 text-xs font-bold tracking-wider text-white">
                ▶ BULLETIN
              </span>
            </span>
            <span className="mt-2 block font-serif text-lg font-bold leading-snug text-ink group-hover:underline">{s.headline}</span>
            {s.publishedAt && <span className="mt-1 block text-sm text-slate">{formatEAT(s.publishedAt)}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
