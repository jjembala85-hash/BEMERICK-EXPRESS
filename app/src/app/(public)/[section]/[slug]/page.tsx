import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getMostRead, getRelatedStories, getRunningAds, getStory } from "@/lib/queries/public";
import { BackButton } from "@/components/back-button";
import { StoryView } from "@/components/story-view";
import { AdBanner } from "@/components/ad-banner";
import { Kicker, MostRead, StoryList } from "@/components/story-list";
import { RichText } from "@/lib/rich-text";
import { formatEAT } from "@/lib/dates";
import { PhotoFrame } from "@/components/photo";
import { YouTubePlayer } from "@/components/youtube-player";
import { shareImagePath } from "@/lib/share";
import { siteUrl } from "@/lib/site";
import { ReaderShare } from "@/components/reader-share";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbs, newsArticle } from "@/lib/structured-data";

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
      // Branded card made from the headline and photo (brand §5); ?v= refreshes it after edits.
      images: [{ url: shareImagePath(section, slug, "link", story.updatedPublicAt ?? story.publishedAt), width: 1200, height: 630, alt: story.headline }],
    },
    twitter: { card: "summary_large_image" },
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
  const [story, ads] = await Promise.all([getStory(section, slug), getRunningAds()]);
  if (!story) notFound();

  const path = `/${story.sectionSlug}/${story.slug}`;
  const structured = [
    newsArticle({
      path,
      headline: story.headline,
      description: story.standfirst,
      section: story.sectionName,
      sectionPath: `/${story.sectionSlug}`,
      published: story.firstPublishedAt ?? story.publishedAt,
      modified: story.updatedPublicAt,
      // Google wants several aspect ratios; the share images give 16:9 and 1:1.
      images: [
        shareImagePath(story.sectionSlug, story.slug, "link", story.updatedPublicAt ?? story.publishedAt),
        shareImagePath(story.sectionSlug, story.slug, "square", story.updatedPublicAt ?? story.publishedAt),
        ...(story.photo ? [story.photo.src] : []),
      ],
      authors: story.authors.map((a) => ({ name: a.name, path: a.hasPage ? `/author/${a.slug}` : null })),
      video: story.youtubeVideoId ? { id: story.youtubeVideoId } : null,
    }),
    breadcrumbs([
      { name: "Home", path: "/" },
      { name: story.sectionName, path: `/${story.sectionSlug}` },
      { name: story.headline, path },
    ]),
  ];

  return (
    <article>
      <JsonLd data={structured} />
      <StoryView id={story.id} />
      <div className="mb-2">
        <BackButton fallback={`/${story.sectionSlug}`} />
      </div>
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

      <ReaderShare url={`${siteUrl()}${path}`} headline={story.headline} />

      <AdBanner running={ads} slot="story" className="mt-10" />

      <Suspense fallback={null}>
        <Related story={story} />
      </Suspense>
      <Suspense fallback={null}>
        <MostReadNow exclude={story.id} />
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

async function MostReadNow({ exclude }: { exclude: string }) {
  const stories = (await getMostRead({ limit: 6 })).filter((s) => s.id !== exclude).slice(0, 5);
  if (stories.length === 0) return null;
  return (
    <div className="mt-10">
      <MostRead stories={stories} />
    </div>
  );
}
