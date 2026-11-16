// The ONLY place public pages read stories from. Every query goes through
// isPublic(), so drafts and unpublished stories can never leak to readers.
import { and, desc, eq, lte } from "drizzle-orm";
import { connection } from "next/server";
import { getDb } from "@/db";
import { article, articleAuthor, articleTranslation, media, section, staffProfile } from "@/db/schema";
import { toPhoto } from "@/lib/media";

// "Now" must be read on a real visit, not while Next.js prerenders or prefetches,
// so every query below awaits connection() before calling isPublic().
const isPublic = () =>
  and(eq(article.status, "published"), lte(article.publishedAt, new Date()));

const cardFields = {
  id: article.id,
  type: article.type,
  priority: article.priority,
  publishedAt: article.publishedAt,
  headline: articleTranslation.headline,
  standfirst: articleTranslation.standfirst,
  slug: articleTranslation.slug,
  sectionSlug: section.slug,
  sectionName: section.name,
  photo: {
    r2Key: media.r2Key,
    variants: media.variants,
    width: media.width,
    height: media.height,
    altText: media.altText,
    credit: media.credit,
    caption: media.caption,
  },
};

export type StoryCard = Awaited<ReturnType<typeof getLatestStories>>[number];

export async function getLatestStories(options: { limit?: number; sectionSlug?: string; lang?: string } = {}) {
  const { limit = 20, sectionSlug, lang = "en" } = options;
  await connection();
  const rows = await getDb()
    .select(cardFields)
    .from(article)
    .innerJoin(articleTranslation, eq(articleTranslation.articleId, article.id))
    .innerJoin(section, eq(section.id, article.primarySectionId))
    .leftJoin(media, eq(media.id, article.leadMediaId))
    .where(
      and(
        eq(articleTranslation.lang, lang),
        isPublic(),
        sectionSlug ? eq(section.slug, sectionSlug) : undefined,
      ),
    )
    .orderBy(desc(article.publishedAt))
    .limit(limit);
  return rows.map((row) => ({ ...row, photo: toPhoto(row.photo) }));
}

/** Latest stories from the same section, without the one being read. */
export async function getRelatedStories(story: { id: string; sectionSlug: string }, limit = 4) {
  const stories = await getLatestStories({ sectionSlug: story.sectionSlug, limit: limit + 1 });
  return stories.filter((s) => s.id !== story.id).slice(0, limit);
}

export async function getStory(sectionSlug: string, slug: string, lang = "en") {
  await connection();
  const db = getDb();
  const [story] = await db
    .select({
      ...cardFields,
      body: articleTranslation.body,
      seoTitle: articleTranslation.seoTitle,
      seoDescription: articleTranslation.seoDescription,
      firstPublishedAt: article.firstPublishedAt,
      updatedPublicAt: article.updatedPublicAt,
    })
    .from(article)
    .innerJoin(articleTranslation, eq(articleTranslation.articleId, article.id))
    .innerJoin(section, eq(section.id, article.primarySectionId))
    .leftJoin(media, eq(media.id, article.leadMediaId))
    .where(
      and(
        eq(articleTranslation.slug, slug),
        eq(articleTranslation.lang, lang),
        eq(section.slug, sectionSlug),
        isPublic(),
      ),
    )
    .limit(1);
  if (!story) return null;

  const authors = await db
    .select({ name: staffProfile.displayName, slug: staffProfile.slug, jobTitle: staffProfile.jobTitle })
    .from(articleAuthor)
    .innerJoin(staffProfile, eq(staffProfile.userId, articleAuthor.staffId))
    .where(eq(articleAuthor.articleId, story.id))
    .orderBy(articleAuthor.position);

  return { ...story, photo: toPhoto(story.photo), authors };
}
