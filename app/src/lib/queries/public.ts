// The ONLY place public pages read stories from. Every query goes through
// isPublic(), so drafts and unpublished stories can never leak to readers.
import { and, asc, desc, eq, gt, inArray, isNull, lte } from "drizzle-orm";
import { connection } from "next/server";
import { getDb } from "@/db";
import {
  article,
  articleAuthor,
  articleCorrection,
  articleTranslation,
  breakingAlert,
  homepageSlot,
  media,
  section,
  staffProfile,
} from "@/db/schema";
import { toPhoto } from "@/lib/media";
import { assembleHomepage } from "@/lib/homepage";

// "Now" must be read on a real visit, not while Next.js prerenders or prefetches,
// so every query below awaits connection() before calling isPublic().
// A scheduled story counts as live once its go-live time (publishedAt) has passed,
// so scheduling works without a cron job (D-027).
const isPublic = () =>
  and(inArray(article.status, ["published", "scheduled"]), lte(article.publishedAt, new Date()));

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

  const corrections = await db
    .select({ id: articleCorrection.id, body: articleCorrection.body, createdAt: articleCorrection.createdAt })
    .from(articleCorrection)
    .where(eq(articleCorrection.articleId, story.id))
    .orderBy(asc(articleCorrection.createdAt));

  return { ...story, photo: toPhoto(story.photo), authors, corrections };
}

/** Latest corrections on stories readers can see, for the public Corrections page. */
export async function getRecentCorrections(limit = 50, lang = "en") {
  await connection();
  return getDb()
    .select({
      id: articleCorrection.id,
      body: articleCorrection.body,
      createdAt: articleCorrection.createdAt,
      headline: articleTranslation.headline,
      slug: articleTranslation.slug,
      sectionSlug: section.slug,
    })
    .from(articleCorrection)
    .innerJoin(article, eq(article.id, articleCorrection.articleId))
    .innerJoin(articleTranslation, eq(articleTranslation.articleId, article.id))
    .innerJoin(section, eq(section.id, article.primarySectionId))
    .where(and(eq(articleTranslation.lang, lang), isPublic()))
    .orderBy(desc(articleCorrection.createdAt))
    .limit(limit);
}

/** Lead, Top Stories and Latest: the editor's board with automatic fallbacks. */
export async function getHomepage(lang = "en") {
  await connection();
  const [slots, newest] = await Promise.all([
    getDb()
      .select({
        ...cardFields,
        slotZone: homepageSlot.zone,
        slotPosition: homepageSlot.position,
        slotPinnedUntil: homepageSlot.pinnedUntil,
        slotOverrideHeadline: homepageSlot.overrideHeadline,
      })
      .from(homepageSlot)
      .innerJoin(article, eq(article.id, homepageSlot.articleId))
      .innerJoin(articleTranslation, eq(articleTranslation.articleId, article.id))
      .innerJoin(section, eq(section.id, article.primarySectionId))
      .leftJoin(media, eq(media.id, article.leadMediaId))
      .where(and(eq(articleTranslation.lang, lang), isPublic())),
    getLatestStories({ limit: 30, lang }),
  ]);
  const placed = slots.map(({ slotZone, slotPosition, slotPinnedUntil, slotOverrideHeadline, ...story }) => ({
    zone: slotZone,
    position: slotPosition,
    pinnedUntil: slotPinnedUntil,
    overrideHeadline: slotOverrideHeadline,
    story: { ...story, photo: toPhoto(story.photo) },
  }));
  return assembleHomepage(placed, newest, new Date());
}

/** The breaking banner showing right now, if any. */
export async function getActiveBreaking(lang = "en") {
  await connection();
  const now = new Date();
  const [alert] = await getDb()
    .select({
      id: breakingAlert.id,
      text: breakingAlert.text,
      articleId: breakingAlert.articleId,
    })
    .from(breakingAlert)
    .where(and(isNull(breakingAlert.clearedAt), lte(breakingAlert.startsAt, now), gt(breakingAlert.expiresAt, now)))
    .orderBy(desc(breakingAlert.startsAt))
    .limit(1);
  if (!alert) return null;

  // Link only to a story readers can actually open.
  let href: string | null = null;
  if (alert.articleId) {
    const [target] = await getDb()
      .select({ slug: articleTranslation.slug, sectionSlug: section.slug })
      .from(article)
      .innerJoin(articleTranslation, eq(articleTranslation.articleId, article.id))
      .innerJoin(section, eq(section.id, article.primarySectionId))
      .where(and(eq(article.id, alert.articleId), eq(articleTranslation.lang, lang), isPublic()))
      .limit(1);
    if (target) href = `/${target.sectionSlug}/${target.slug}`;
  }
  return { id: alert.id, text: alert.text, href };
}
