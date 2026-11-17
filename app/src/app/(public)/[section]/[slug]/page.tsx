import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getRelatedStories, getStory } from "@/lib/queries/public";
import { Kicker, StoryList } from "@/components/story-list";
import { RichText } from "@/lib/rich-text";
import { formatEAT } from "@/lib/dates";
import { PhotoFrame } from "@/components/photo";
import { YouTubePlayer } from "@/components/youtube-player";

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
      publishedTime: (story.firstPublishedAt ?? story.publishedAt)?.toISOString(),
      modifiedTime: story.updatedPublicAt?.toISOString(),
      images: story.photo
        ? [{ url: story.photo.src, width: story.photo.width ?? undefined, height: story.photo.height ?? undefined, alt: story.photo.alt }]
        : undefined,
    },
    twitter: { card: story.photo ? "summary_large_image" : "summary" },
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
          <p className="font-semibold text-ink">
            By{" "}
            {story.authors.map((a, i) => (
              <span key={a.slug}>
                {i > 0 && " and "}
                {a.hasPage ? (
                  <Link href={`/author/${a.slug}`} rel="author" className="underline decoration-crane-gold decoration-2 underline-offset-2 hover:text-lake-ink">
                    {a.name}
                  </Link>
                ) : (
                  a.name
                )}
              </span>
            ))}
          </p>
        )}
        {(story.firstPublishedAt ?? story.publishedAt) && <p>{formatEAT((story.firstPublishedAt ?? story.publishedAt)!)}</p>}
        {story.updatedPublicAt && <p>Updated {formatEAT(story.updatedPublicAt)}</p>}
      </div>

      {story.youtubeVideoId ? (
        <figure className="mt-6">
          <YouTubePlayer
            videoId={story.youtubeVideoId}
            title={story.headline}
            poster={story.photo ? { src: story.photo.src, srcSet: story.photo.srcSet || undefined, alt: story.photo.alt } : null}
          />
          {story.photo && <figcaption className="mt-1 text-xs text-slate">Poster photo: {story.photo.credit}</figcaption>}
        </figure>
      ) : story.photo && (
        <figure className="mt-6">
          <PhotoFrame photo={story.photo} sizes="(min-width: 44rem) 42rem, 100vw" priority className="rounded-md" />
          <figcaption className="mt-2 text-sm leading-snug text-slate">
            {story.photo.caption && <span className="text-ink">{story.photo.caption} </span>}
            <span>Photo: {story.photo.credit}</span>
          </figcaption>
        </figure>
      )}

      <div className="mt-7 font-serif text-[1.15rem] leading-[1.7] text-ink sm:text-xl sm:leading-[1.7]">
        <RichText doc={story.body} />
      </div>

      {story.corrections.length > 0 && (
        <aside aria-label="Corrections" className="mt-8 space-y-3">
          {story.corrections.map((c) => (
            <p key={c.id} className="border-l-4 border-crane-gold bg-surface px-4 py-3 text-[0.95rem] leading-relaxed text-ink">
              <span className="font-semibold">Correction, {formatEAT(c.createdAt)}:</span> {c.body}
            </p>
          ))}
        </aside>
      )}

      {story.tags.length > 0 && (
        <nav aria-label="Topics" className="mt-8">
          <ul className="flex flex-wrap gap-2">
            {story.tags.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/topic/${t.slug}`}
                  className="inline-block rounded-full border border-mist bg-surface px-3 py-1 text-sm font-semibold text-lake-ink hover:border-lake-ink"
                >
                  {t.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <ShareLinks path={path} text={shareText} />

      <Suspense fallback={null}>
        <Related story={story} />
      </Suspense>
    </article>
  );
}

async function Related({ story }: { story: { id: string; sectionSlug: string; sectionName: string } }) {
  const related = await getRelatedStories(story);
  if (related.length === 0) return null;
  return (
    <aside aria-labelledby="related-heading" className="mt-12 border-t-2 border-crane-gold pt-6">
      <h2 id="related-heading" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">
        More from {story.sectionName}
      </h2>
      <StoryList stories={related} showSection={false} />
    </aside>
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
