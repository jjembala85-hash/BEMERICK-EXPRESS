import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getLatestStories } from "@/lib/queries/public";
import { BulletinGrid } from "@/components/bulletin-grid";

const PAGE_SIZE = 18;

export const metadata: Metadata = {
  title: "Bulletins",
  description: "BX News video bulletins: the day's news from Uganda in a few minutes.",
  alternates: { canonical: "/bulletins" },
};

export default function BulletinsPage({ searchParams }: PageProps<"/bulletins">) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      <header className="border-b-2 border-crane-gold pb-5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate">
          <span className="inline-block h-3.5 w-1 bg-crane-gold" aria-hidden />
          Watch
        </p>
        <h1 className="mt-1 font-serif text-4xl font-bold text-ink">Bulletins</h1>
        <p className="mt-2 text-lg text-slate">The day&apos;s news in a few minutes. Videos play from YouTube only when you tap.</p>
      </header>
      <Suspense fallback={<p className="mt-8 text-slate">Loading…</p>}>
        <Bulletins searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Bulletins({ searchParams }: Pick<PageProps<"/bulletins">, "searchParams">) {
  const pageInput = (await searchParams).page;
  const page = Math.min(500, Math.max(1, Number.parseInt(typeof pageInput === "string" ? pageInput : "1", 10) || 1));
  const rows = await getLatestStories({ type: "bulletin", limit: PAGE_SIZE + 1, offset: (page - 1) * PAGE_SIZE });
  const stories = rows.slice(0, PAGE_SIZE);
  const hasMore = rows.length > PAGE_SIZE;
  const href = (n: number) => (n === 1 ? "/bulletins" : `/bulletins?page=${n}`);

  if (stories.length === 0) {
    return <p className="mt-8 text-slate">{page > 1 ? "No older bulletins." : "Video bulletins will appear here."}</p>;
  }
  return (
    <>
      <BulletinGrid stories={stories} />
      {(page > 1 || hasMore) && (
        <nav aria-label="Pages" className="mt-8 flex items-center justify-between border-t border-mist pt-4">
          {page > 1 ? <Link href={href(page - 1)} className="font-semibold text-lake-ink hover:underline">← Newer</Link> : <span />}
          {hasMore ? <Link href={href(page + 1)} className="font-semibold text-lake-ink hover:underline">Older →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
