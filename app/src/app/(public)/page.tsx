import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getLatestStories } from "@/lib/queries/public";
import { Kicker, StoryList } from "@/components/story-list";
import { formatEAT } from "@/lib/dates";

// Interim homepage: newest story leads, the rest follow. The editor-curated
// Lead and Top Stories board replaces this in Phase 3.
export default function Home() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
      <Suspense fallback={<p className="text-slate">Loading the latest stories…</p>}>
        <Latest />
      </Suspense>
    </div>
  );
}

async function Latest() {
  await connection();
  const stories = await getLatestStories({ limit: 21 });

  if (stories.length === 0) return <ComingSoon />;
  const [lead, ...rest] = stories;

  return (
    <>
      <article className="border-b-2 border-crane-gold pb-8">
        <Kicker section={lead.sectionName} type={lead.type} />
        <Link href={`/${lead.sectionSlug}/${lead.slug}`} className="group mt-2 block">
          <h1 className="font-serif text-3xl font-bold leading-tight text-ink group-hover:underline sm:text-5xl">
            {lead.headline}
          </h1>
          {lead.standfirst && (
            <p className="mt-3 font-serif text-lg italic leading-relaxed text-slate sm:text-xl">{lead.standfirst}</p>
          )}
        </Link>
        {lead.publishedAt && <p className="mt-3 text-sm text-slate">{formatEAT(lead.publishedAt)}</p>}
      </article>

      {rest.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">Latest</h2>
          <StoryList stories={rest} />
        </section>
      )}
    </>
  );
}

function ComingSoon() {
  return (
    <div className="py-10 sm:py-16">
      <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate">
        <span className="inline-block h-4 w-1 bg-crane-gold" aria-hidden />
        Coming soon
      </p>
      <h1 className="font-serif text-4xl font-bold leading-tight text-ink sm:text-5xl">
        Uganda&rsquo;s fast, verified, mobile-first newsroom.
      </h1>
      <p className="mt-5 font-serif text-xl italic leading-relaxed text-slate">News. Insight. Impact.</p>
      <div className="mt-10 h-0.5 w-24 bg-crane-gold" aria-hidden />
      <p className="mt-6 max-w-xl text-base leading-relaxed text-slate">
        BX News is being built. Clear reporting on what happened, what it means, and what happens next.
      </p>
    </div>
  );
}
