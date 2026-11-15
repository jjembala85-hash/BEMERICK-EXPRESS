import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getStory } from "@/lib/queries/public";
import { Kicker } from "@/components/story-list";
import { RichText } from "@/lib/rich-text";
import { formatEAT } from "@/lib/dates";

type Props = PageProps<"/[section]/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section, slug } = await params;
  const story = await getStory(section, slug);
  if (!story) return {};
  return {
    title: story.seoTitle ?? story.headline,
    description: story.seoDescription ?? story.standfirst ?? undefined,
    openGraph: {
      type: "article",
      title: story.headline,
      description: story.standfirst ?? undefined,
      publishedTime: story.firstPublishedAt?.toISOString(),
      modifiedTime: story.updatedPublicAt?.toISOString(),
    },
  };
}

export default function StoryPage({ params }: Props) {
  return (
    <div className="mx-auto w-full max-w-[44rem] px-4 py-8 sm:py-10">
      <Suspense fallback={<p className="text-slate">Loading story…</p>}>
        <Story params={params} />
      </Suspense>
    </div>
  );
}

async function Story({ params }: { params: Props["params"] }) {
  const { section, slug } = await params;
  const story = await getStory(section, slug);
  if (!story) notFound();

  const path = `/${story.sectionSlug}/${story.slug}`;
  const shareText = encodeURIComponent(story.headline);

  return (
    <article>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate">
        <Link href="/" className="hover:underline">Home</Link>
        <span aria-hidden> › </span>
        <Link href={`/${story.sectionSlug}`} className="hover:underline">{story.sectionName}</Link>
      </nav>

      <Kicker section={story.sectionName} type={story.type} />
      <h1 className="mt-2 font-serif text-[1.9rem] font-bold leading-tight text-ink sm:text-[2.6rem]">
        {story.headline}
      </h1>
      {story.standfirst && (
        <p className="mt-4 font-serif text-xl italic leading-relaxed text-slate">{story.standfirst}</p>
      )}

      <div className="mt-5 border-y border-mist py-3 text-sm text-slate">
        {story.authors.length > 0 && (
          <p className="font-semibold text-ink">By {story.authors.map((a) => a.name).join(" and ")}</p>
        )}
        {story.firstPublishedAt && <p>{formatEAT(story.firstPublishedAt)}</p>}
        {story.updatedPublicAt && <p>Updated {formatEAT(story.updatedPublicAt)}</p>}
      </div>

      <div className="mt-7 font-serif text-[1.15rem] leading-[1.7] text-ink sm:text-xl sm:leading-[1.7]">
        <RichText doc={story.body} />
      </div>

      <ShareLinks path={path} text={shareText} />
    </article>
  );
}

function ShareLinks({ path, text }: { path: string; text: string }) {
  // Relative links are resolved by the share targets once the site has its domain;
  // until then they use the address the reader is on.
  const base = process.env.BETTER_AUTH_URL ?? "";
  const url = encodeURIComponent(`${base}${path}`);
  const linkClass = "rounded-md border border-mist px-3.5 py-2 text-sm font-semibold text-ink hover:bg-mist";
  return (
    <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-mist pt-6">
      <span className="mr-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate">Share</span>
      <a className={linkClass} href={`https://wa.me/?text=${text}%20${url}`} target="_blank" rel="noopener noreferrer">
        WhatsApp
      </a>
      <a className={linkClass} href={`https://x.com/intent/post?text=${text}&url=${url}`} target="_blank" rel="noopener noreferrer">
        X
      </a>
    </div>
  );
}
