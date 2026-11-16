import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getRecentCorrections } from "@/lib/queries/public";
import { formatEAT } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Corrections",
  description: "When BX News gets something wrong, we correct it openly. Every correction is listed here.",
};

export default function CorrectionsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <header className="border-b-2 border-crane-gold pb-5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate">
          <span className="inline-block h-3.5 w-1 bg-crane-gold" aria-hidden />
          About BX
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold leading-tight text-ink sm:text-5xl">Corrections</h1>
        <p className="mt-3 font-serif text-lg italic leading-relaxed text-slate">
          When we get something wrong, we fix it and say so. Each correction also appears, dated, at the end of the story.
        </p>
      </header>
      <Suspense fallback={<p className="mt-8 text-slate">Loading corrections…</p>}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  const corrections = await getRecentCorrections();
  if (corrections.length === 0) {
    return <p className="mt-8 text-slate">No corrections so far.</p>;
  }
  return (
    <ol className="mt-6 divide-y divide-mist">
      {corrections.map((c) => (
        <li key={c.id} className="py-5">
          <p className="text-sm text-slate">{formatEAT(c.createdAt)}</p>
          <Link href={`/${c.sectionSlug}/${c.slug}`} className="mt-1 block font-serif text-xl font-semibold text-ink hover:underline">
            {c.headline}
          </Link>
          <p className="mt-1.5 leading-relaxed text-ink">{c.body}</p>
        </li>
      ))}
    </ol>
  );
}
