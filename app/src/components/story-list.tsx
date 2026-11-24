import Link from "next/link";
import type { StoryCard } from "@/lib/queries/public";
import { formatEAT } from "@/lib/dates";
import { PhotoFrame } from "@/components/photo";

const typeLabels: Record<string, string> = {
  analysis: "Analysis",
  opinion: "Opinion",
  feature: "Feature",
  bulletin: "▶ Bulletin",
};

export function Kicker({ section, type }: { section: string; type?: string }) {
  const label = type ? typeLabels[type] : undefined;
  return (
    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate">
      <span className="inline-block h-3.5 w-1 bg-crane-gold" aria-hidden />
      {section}
      {label && <span className="text-lake-ink">· {label}</span>}
    </p>
  );
}

export function StoryList({ stories, showSection = true }: { stories: StoryCard[]; showSection?: boolean }) {
  return (
    <ul className="divide-y divide-mist">
      {stories.map((s) => (
        <li key={s.id} className="flex items-start gap-4 py-5">
          <div className="min-w-0 flex-1">
            {showSection && <Kicker section={s.sectionName} type={s.type} />}
            <Link href={`/${s.sectionSlug}/${s.slug}`} className="group mt-1.5 block">
              <h3 className="font-serif text-xl font-semibold leading-snug text-ink group-hover:underline sm:text-[1.35rem]">
                {s.headline}
              </h3>
              {s.standfirst && <p className="mt-1.5 text-slate">{s.standfirst}</p>}
            </Link>
            {s.publishedAt && <p className="mt-2 text-sm text-slate">{formatEAT(s.publishedAt)}</p>}
          </div>
          {s.photo && (
            <Link
              href={`/${s.sectionSlug}/${s.slug}`}
              className="w-28 shrink-0 sm:w-44"
              tabIndex={-1}
              aria-hidden
            >
              <PhotoFrame photo={{ ...s.photo, alt: "" }} sizes="(min-width: 640px) 176px, 112px" className="rounded-md" />
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

/** "Most read" list (D-048): numbered headlines, no photos, so it stays light. */
export function MostRead({ stories, title = "Most read" }: { stories: StoryCard[]; title?: string }) {
  if (stories.length === 0) return null;
  return (
    <section aria-labelledby="most-read-heading" className="rounded-lg border-t-4 border-crane-gold bg-surface p-4">
      <h2 id="most-read-heading" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">{title}</h2>
      <ol className="mt-2 divide-y divide-mist">
        {stories.map((s, i) => (
          <li key={s.id} className="flex gap-3 py-2.5">
            <span className="font-serif text-2xl font-bold leading-none text-crane-gold" aria-hidden>{i + 1}</span>
            <Link href={`/${s.sectionSlug}/${s.slug}`} className="font-serif font-semibold leading-snug text-ink hover:underline">
              {s.headline}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The story an editor pinned to the top of a section (D-048). */
export function PinnedStory({ story }: { story: StoryCard }) {
  return (
    <article className="mt-6 border-b-2 border-crane-gold pb-6">
      <Link href={`/${story.sectionSlug}/${story.slug}`} className="group block">
        {story.photo && <PhotoFrame photo={story.photo} sizes="(min-width: 56rem) 54rem, 100vw" className="mb-3 rounded-md" />}
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-lake-ink">Editor&apos;s pick</p>
        <h2 className="mt-1 font-serif text-2xl font-bold leading-tight text-ink group-hover:underline sm:text-3xl">{story.headline}</h2>
        {story.standfirst && <p className="mt-2 font-serif text-lg italic leading-relaxed text-slate">{story.standfirst}</p>}
      </Link>
      {story.publishedAt && <p className="mt-2 text-sm text-slate">{formatEAT(story.publishedAt)}</p>}
    </article>
  );
}
