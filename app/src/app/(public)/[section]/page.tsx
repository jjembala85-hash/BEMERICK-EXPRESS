import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { sections, getSection } from "@/lib/sections";
import Link from "next/link";
import { getLatestStories, getLiveState, getRunningAds } from "@/lib/queries/public";
import { AdBanner } from "@/components/ad-banner";
import { StoryList } from "@/components/story-list";

export function generateStaticParams() {
  return sections.map((s) => ({ section: s.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[section]">): Promise<Metadata> {
  const section = getSection((await params).section);
  return section
    ? { title: section.name, description: section.description }
    : {};
}

export default async function SectionPage({ params }: PageProps<"/[section]">) {
  const section = getSection((await params).section);
  if (!section) notFound();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="border-b-2 border-crane-gold pb-4">
        <h1 className="font-serif text-4xl font-bold text-ink">{section.name}</h1>
        <p className="mt-2 text-slate">{section.description}</p>
      </div>
      <Suspense fallback={null}>
        <SectionLive slug={section.slug} />
      </Suspense>
      <Suspense fallback={<p className="mt-8 text-slate">Loading stories…</p>}>
        <SectionStories slug={section.slug} name={section.name} />
      </Suspense>
    </div>
  );
}

async function SectionStories({ slug, name }: { slug: string; name: string }) {
  await connection();
  const [stories, ads] = await Promise.all([getLatestStories({ sectionSlug: slug, limit: 30 }), getRunningAds()]);
  if (stories.length === 0) {
    return <p className="mt-8 text-slate">Stories in {name} will appear here.</p>;
  }
  return (
    <>
      <AdBanner running={ads} slot="section" className="mt-6" />
      <StoryList stories={stories} showSection={false} />
    </>
  );
}

/** Streams on air that the newsroom tagged with this section (D-043). */
async function SectionLive({ slug }: { slug: string }) {
  const { onAir } = await getLiveState();
  const streams = onAir.filter((s) => s.sectionSlug === slug);
  if (streams.length === 0) return null;
  return (
    <ul aria-label="Live now" className="mt-6 space-y-2">
      {streams.map((s) => (
        <li key={s.id}>
          <Link href={`/live#live-${s.id}`} className="flex items-center gap-3 rounded-lg border-2 border-[#c8401f] bg-surface p-4 hover:bg-mist">
            <span className="flex shrink-0 items-center gap-1.5 rounded bg-[#c8401f] px-2 py-1 text-xs font-bold tracking-wider text-white">
              <span className="size-2 animate-pulse rounded-full bg-white motion-reduce:animate-none" aria-hidden />
              LIVE
            </span>
            <span className="font-serif text-lg font-bold leading-snug text-ink">{s.title}</span>
            <span className="ml-auto shrink-0 text-sm font-semibold text-lake-ink" aria-hidden>Watch →</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
