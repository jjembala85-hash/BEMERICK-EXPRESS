import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getLatestStories, getTag } from "@/lib/queries/public";
import { StoryList } from "@/components/story-list";

const PAGE_SIZE = 20;

type Props = PageProps<"/topic/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const topic = await getTag((await params).slug);
  if (!topic) return {};
  const description = topic.description ?? `The latest BX News stories on ${topic.name}.`;
  return {
    title: topic.name,
    description,
    alternates: { canonical: `/topic/${topic.slug}` },
    openGraph: { title: `${topic.name} · BX News`, description },
  };
}

export default function TopicPage({ params, searchParams }: Props) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
      <Suspense fallback={<p className="text-slate">Loading…</p>}>
        <Topic params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Topic({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const topic = await getTag((await params).slug);
  if (!topic) notFound();
  const pageInput = (await searchParams).page;
  const page = Math.min(500, Math.max(1, Number.parseInt(typeof pageInput === "string" ? pageInput : "1", 10) || 1));

  // One extra story tells us whether there is an older page.
  const rows = await getLatestStories({ tagId: topic.id, limit: PAGE_SIZE + 1, offset: (page - 1) * PAGE_SIZE });
  // A tag with no published stories has nothing to show readers.
  if (rows.length === 0 && page === 1) notFound();
  const stories = rows.slice(0, PAGE_SIZE);
  const hasMore = rows.length > PAGE_SIZE;
  const href = (n: number) => (n === 1 ? `/topic/${topic.slug}` : `/topic/${topic.slug}?page=${n}`);

  return (
    <>
      <header className="border-b-2 border-crane-gold pb-5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate">
          <span className="inline-block h-3.5 w-1 bg-crane-gold" aria-hidden />
          Topic
        </p>
        <h1 className="mt-1 font-serif text-4xl font-bold leading-tight text-ink">{topic.name}</h1>
        {topic.description && <p className="mt-3 max-w-2xl text-lg leading-relaxed text-slate">{topic.description}</p>}
      </header>

      {stories.length === 0 ? (
        <p className="mt-8 text-slate">No older stories.</p>
      ) : (
        <StoryList stories={stories} />
      )}

      {(page > 1 || hasMore) && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between border-t border-mist pt-4">
          {page > 1 ? (
            <Link href={href(page - 1)} className="font-semibold text-lake-ink hover:underline">← Newer</Link>
          ) : (
            <span />
          )}
          {hasMore ? (
            <Link href={href(page + 1)} className="font-semibold text-lake-ink hover:underline">Older →</Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
