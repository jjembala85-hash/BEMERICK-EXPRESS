import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { sections, getSection } from "@/lib/sections";
import { getLatestStories } from "@/lib/queries/public";
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
      <Suspense fallback={<p className="mt-8 text-slate">Loading stories…</p>}>
        <SectionStories slug={section.slug} name={section.name} />
      </Suspense>
    </div>
  );
}

async function SectionStories({ slug, name }: { slug: string; name: string }) {
  await connection();
  const stories = await getLatestStories({ sectionSlug: slug, limit: 30 });
  if (stories.length === 0) {
    return <p className="mt-8 text-slate">Stories in {name} will appear here.</p>;
  }
  return <StoryList stories={stories} showSection={false} />;
}
