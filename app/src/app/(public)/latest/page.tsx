import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getLatestStories } from "@/lib/queries/public";
import { StoryList } from "@/components/story-list";

const PAGE_SIZE = 25;

export const metadata: Metadata = {
  title: "Latest",
  description: "The newest stories from BX News, as they are published.",
  alternates: { canonical: "/latest" },
};

export default function LatestPage({ searchParams }: PageProps<"/latest">) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
      <header className="border-b-2 border-crane-gold pb-4">
        <h1 className="font-serif text-4xl font-bold text-ink">Latest</h1>
        <p className="mt-2 text-slate">Every story, newest first.</p>
      </header>
      <Suspense fallback={<p className="mt-8 text-slate">Loading…</p>}>
        <Latest searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Latest({ searchParams }: Pick<PageProps<"/latest">, "searchParams">) {
  const input = (await searchParams).page;
  const page = Math.min(500, Math.max(1, Number.parseInt(typeof input === "string" ? input : "1", 10) || 1));
  const rows = await getLatestStories({ limit: PAGE_SIZE + 1, offset: (page - 1) * PAGE_SIZE });
  const stories = rows.slice(0, PAGE_SIZE);
  const hasMore = rows.length > PAGE_SIZE;
  if (stories.length === 0) return <p className="mt-8 text-slate">{page > 1 ? "No older stories." : "Stories will appear here."}</p>;
  return (
    <>
      <StoryList stories={stories} />
      {(page > 1 || hasMore) && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between border-t border-mist pt-4">
          {page > 1 ? <Link href={page === 2 ? "/latest" : `/latest?page=${page - 1}`} className="font-semibold text-lake-ink hover:underline">← Newer</Link> : <span />}
          {hasMore ? <Link href={`/latest?page=${page + 1}`} className="font-semibold text-lake-ink hover:underline">Older →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
