import type { Metadata } from "next";
import { Suspense } from "react";
import { searchStories } from "@/lib/queries/public";
import { StoryList } from "@/components/story-list";

export const metadata: Metadata = {
  title: "Search",
  description: "Search BX News stories.",
  // Search result pages are never indexed.
  robots: { index: false, follow: true },
};

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
      <h1 className="font-serif text-4xl font-bold text-ink">Search</h1>
      <Suspense fallback={<SearchForm q="" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function SearchForm({ q }: { q: string }) {
  return (
    <form action="/search" role="search" className="mt-4 flex gap-2">
      <label htmlFor="q" className="sr-only">Search stories</label>
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={q}
        maxLength={120}
        autoFocus={!q}
        placeholder="e.g. fuel prices, budget, Cranes"
        className="w-full rounded-md border border-mist bg-surface px-3 py-2.5 text-lg text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20"
      />
      <button type="submit" className="rounded-md bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-deep">Search</button>
    </form>
  );
}

async function Results({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const input = (await searchParams).q;
  const q = typeof input === "string" ? input.trim().slice(0, 120) : "";
  const stories = q.length >= 2 ? await searchStories(q, { limit: 30 }) : [];
  return (
    <>
      <SearchForm q={q} />
      {q.length >= 2 && (
        <p className="mt-6 text-sm text-slate" role="status">
          {stories.length === 0 ? `No stories found for “${q}”. Try other words.` : `${stories.length}${stories.length === 30 ? "+" : ""} ${stories.length === 1 ? "story" : "stories"} for “${q}”`}
        </p>
      )}
      {stories.length > 0 && <StoryList stories={stories} />}
    </>
  );
}
