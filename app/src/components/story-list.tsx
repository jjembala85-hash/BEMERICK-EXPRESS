import Link from "next/link";
import type { StoryCard } from "@/lib/queries/public";
import { formatEAT } from "@/lib/dates";

const typeLabels: Record<string, string> = {
  analysis: "Analysis",
  opinion: "Opinion",
  feature: "Feature",
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
        <li key={s.id} className="py-5">
          {showSection && <Kicker section={s.sectionName} type={s.type} />}
          <Link href={`/${s.sectionSlug}/${s.slug}`} className="group mt-1.5 block">
            <h3 className="font-serif text-xl font-semibold leading-snug text-ink group-hover:underline sm:text-[1.35rem]">
              {s.headline}
            </h3>
            {s.standfirst && <p className="mt-1.5 text-slate">{s.standfirst}</p>}
          </Link>
          {s.publishedAt && <p className="mt-2 text-sm text-slate">{formatEAT(s.publishedAt)}</p>}
        </li>
      ))}
    </ul>
  );
}
