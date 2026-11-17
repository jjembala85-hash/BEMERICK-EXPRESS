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
