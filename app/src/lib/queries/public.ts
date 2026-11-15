// The ONLY place public pages read stories from. Every query goes through
// isPublic(), so drafts and unpublished stories can never leak to readers.
import { and, desc, eq, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { article, articleAuthor, articleTranslation, section, staffProfile } from "@/db/schema";

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
};

export type StoryCard = Awaited<ReturnType<typeof getLatestStories>>[number];

export async function getLatestStories(options: { limit?: number; sectionSlug?: string; lang?: string } = {}) {
  const { limit = 20, sectionSlug, lang = "en" } = options;
  return getDb()
    .select(cardFields)
    .from(article)
    .innerJoin(articleTranslation, eq(articleTranslation.articleId, article.id))
    .innerJoin(section, eq(section.id, article.primarySectionId))
    .where(
      and(
        eq(articleTranslation.lang, lang),
        isPublic(),
        sectionSlug ? eq(section.slug, sectionSlug) : undefined,
      ),
    )
    .orderBy(desc(article.publishedAt))
    .limit(limit);
}

export async function getStory(sectionSlug: string, slug: string, lang = "en") {
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

  return { ...story, authors };
}
