import Link from "next/link";
import { Suspense } from "react";
import { getHomepage, type StoryCard } from "@/lib/queries/public";
import { Kicker, StoryList } from "@/components/story-list";
import { formatEAT } from "@/lib/dates";
import { PhotoFrame } from "@/components/photo";
import { JsonLd } from "@/components/json-ld";
import { organization, website } from "@/lib/structured-data";

// Lead and Top Stories come from the editors' homepage board; empty or expired
// places fall back to the newest stories (lib/homepage.ts).
export default function Home() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      <JsonLd data={[organization(), website()]} />
      <Suspense fallback={<p className="text-slate">Loading the latest stories…</p>}>
        <FrontPage />
      </Suspense>
    </div>
  );
}

async function FrontPage() {
  const { lead, top, latest } = await getHomepage();
  if (!lead) return <ComingSoon />;

  return (
    <>
      <article className="border-b-2 border-crane-gold pb-8">
        <Link href={`/${lead.sectionSlug}/${lead.slug}`} className="group block">
          {lead.photo && (
            <PhotoFrame photo={lead.photo} sizes="(min-width: 64rem) 62rem, 100vw" priority className="mb-4 rounded-md" />
          )}
          <Kicker section={lead.sectionName} type={lead.type} />
          <h1 className="mt-2 font-serif text-3xl font-bold leading-tight text-ink group-hover:underline sm:text-5xl">
            {lead.headline}
          </h1>
          {lead.standfirst && (
            <p className="mt-3 font-serif text-lg italic leading-relaxed text-slate sm:text-xl">{lead.standfirst}</p>
          )}
        </Link>
        {lead.publishedAt && <p className="mt-3 text-sm text-slate">{formatEAT(lead.publishedAt)}</p>}
      </article>

      {top.length > 0 && (
        <section aria-labelledby="top-heading" className="mt-8 border-b border-mist pb-8">
          <h2 id="top-heading" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">Top stories</h2>
          <ul className="mt-4 grid gap-6 sm:grid-cols-2">
            {top.map((s) => (
              <TopCard key={s.id} story={s} />
            ))}
          </ul>
        </section>
      )}

      {latest.length > 0 && (
        <section aria-labelledby="latest-heading" className="mt-8">
          <h2 id="latest-heading" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">Latest</h2>
          <StoryList stories={latest} />
        </section>
      )}
    </>
  );
}

function TopCard({ story }: { story: StoryCard }) {
  return (
    <li>
      <Link href={`/${story.sectionSlug}/${story.slug}`} className="group block">
        {story.photo && (
          <PhotoFrame photo={story.photo} sizes="(min-width: 40rem) 30rem, 100vw" className="mb-3 rounded-md" />
        )}
        <Kicker section={story.sectionName} type={story.type} />
        <h3 className="mt-1.5 font-serif text-xl font-semibold leading-snug text-ink group-hover:underline sm:text-[1.35rem]">
          {story.headline}
        </h3>
        {story.standfirst && <p className="mt-1.5 line-clamp-3 text-slate">{story.standfirst}</p>}
      </Link>
    </li>
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
