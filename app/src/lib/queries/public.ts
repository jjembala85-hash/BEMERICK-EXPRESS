// The ONLY place public pages read stories from. Every query goes through
// isPublic(at), so drafts and unpublished stories can never leak to readers.
//
// Caching (roadmap 2.6, D-039): each exported function reads the clock on a real
// visit (connection()), rounds it to the minute and passes it to a cached inner
// query ('use cache: remote', Vercel's shared Runtime Cache). So a busy page hits
// the database about once a minute per region instead of on every view, scheduled
// stories still appear on time (the minute is part of the cache key), and every
// newsroom change clears the cache at once (publicContentChanged in lib/cache.ts).
import { and, asc, desc, eq, gt, inArray, isNull, lte, sql } from "drizzle-orm";
import { connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import {
  article,
  articleAuthor,
  articleCorrection,
  articleTag,
  articleTranslation,
  breakingAlert,
  homepageSlot,
  media,
  section,
  liveStream,
  staffProfile,
  tag,
} from "@/db/schema";
import { toPhoto } from "@/lib/media";
import { assembleHomepage } from "@/lib/homepage";
import { PUBLIC_CONTENT_TAG } from "@/lib/cache-tags";

// A scheduled story counts as live once its go-live time (publishedAt) has passed,
// so scheduling works without a cron job (D-027).
const isPublic = (at: number) =>
  and(inArray(article.status, ["published", "scheduled"]), lte(article.publishedAt, new Date(at)));

/**
 * The clock, read on a real visit only (never while prerendering).
 * `at` is rounded UP to the minute and keys the cache, so the cached query may
 * include something going live later this minute; `now` is exact, and the
 * wrappers below drop anything not live yet. So nothing ever appears early
 * (embargoes hold) and a story published this second shows at once.
 */
async function clock() {
  await connection();
  const now = Date.now();
  return { now, at: Math.ceil(now / 60_000) * 60_000 };
}

/** Exact-time check outside the cache (see clock()). */
function liveBy<T extends { publishedAt: Date | null }>(rows: T[], now: number) {
  return rows.filter((r) => r.publishedAt !== null && r.publishedAt.getTime() <= now);
}

/** Tag and lifetime for every cached public query. */
function cachedPublic() {
  cacheTag(PUBLIC_CONTENT_TAG);
  cacheLife({ stale: 60, revalidate: 60, expire: 600 });
}

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

export type StoryCard = Awaited<ReturnType<typeof getLatestStoriesCached>>[number];

export async function getLatestStories(options: LatestOptions = {}) {
  const { now, at } = await clock();
  const limit = options.limit ?? 20;
  // A few extra rows cover stories that go live later this minute.
  return liveBy(await getLatestStoriesCached(at, { ...options, limit: limit + 5 }), now).slice(0, limit);
}

type LatestOptions = {
  limit?: number;
  offset?: number;
  sectionSlug?: string;
  authorId?: string;
  tagId?: string;
  type?: (typeof article.type.enumValues)[number];
  lang?: string;
};

async function getLatestStoriesCached(
  at: number,
  options: {
    limit?: number;
    offset?: number;
    sectionSlug?: string;
    authorId?: string;
    tagId?: string;
    type?: (typeof article.type.enumValues)[number];
    lang?: string;
  } = {},
) {
  "use cache: remote";
  cachedPublic();
  const { limit = 20, offset = 0, sectionSlug, authorId, tagId, type, lang = "en" } = options;
  const rows = await getDb()
    .select(cardFields)
    .from(article)
    .innerJoin(articleTranslation, eq(articleTranslation.articleId, article.id))
    .innerJoin(section, eq(section.id, article.primarySectionId))
    .leftJoin(media, eq(media.id, article.leadMediaId))
    .where(
      and(
        eq(articleTranslation.lang, lang),
        isPublic(at),
        sectionSlug ? eq(section.slug, sectionSlug) : undefined,
        authorId
          ? inArray(
              article.id,
              getDb().select({ id: articleAuthor.articleId }).from(articleAuthor).where(eq(articleAuthor.staffId, authorId)),
            )
          : undefined,
        tagId
          ? inArray(article.id, getDb().select({ id: articleTag.articleId }).from(articleTag).where(eq(articleTag.tagId, tagId)))
          : undefined,
        type ? eq(article.type, type) : undefined,
      ),
    )
    .orderBy(desc(article.publishedAt), desc(article.id))
    .limit(limit)
    .offset(offset);
  return rows.map((row) => ({ ...row, photo: toPhoto(row.photo) }));
}

/** Everyone who has chosen to have an author page, for the Our team page. */
export async function getPublicAuthors() {
  await connection();
  return getPublicAuthorsCached();
}

async function getPublicAuthorsCached() {
  "use cache: remote";
  cachedPublic();
  const rows = await getDb()
    .select({
      name: staffProfile.displayName,
      slug: staffProfile.slug,
      jobTitle: staffProfile.jobTitle,
      photo: {
        r2Key: media.r2Key,
        variants: media.variants,
        width: media.width,
        height: media.height,
        altText: media.altText,
        credit: media.credit,
        caption: media.caption,
      },
    })
    .from(staffProfile)
    .leftJoin(media, eq(media.id, staffProfile.photoMediaId))
    .where(eq(staffProfile.isPublic, true))
    .orderBy(asc(staffProfile.displayName));
  return rows.map((row) => ({ ...row, photo: toPhoto(row.photo) }));
}

/** A journalist's public profile. Null unless they have chosen to have an author page. */
export async function getAuthor(slug: string) {
  await connection();
  return getAuthorCached(slug);
}

async function getAuthorCached(slug: string) {
  "use cache: remote";
  cachedPublic();
  const [row] = await getDb()
    .select({
      userId: staffProfile.userId,
      name: staffProfile.displayName,
      slug: staffProfile.slug,
      jobTitle: staffProfile.jobTitle,
      bio: staffProfile.bio,
      xHandle: staffProfile.xHandle,
      photo: {
        r2Key: media.r2Key,
        variants: media.variants,
        width: media.width,
        height: media.height,
        altText: media.altText,
        credit: media.credit,
        caption: media.caption,
      },
    })
    .from(staffProfile)
    .leftJoin(media, eq(media.id, staffProfile.photoMediaId))
    .where(and(eq(staffProfile.slug, slug), eq(staffProfile.isPublic, true)))
    .limit(1);
  return row ? { ...row, photo: toPhoto(row.photo) } : null;
}

/** Latest stories from the same section, without the one being read. */
export async function getRelatedStories(story: { id: string; sectionSlug: string }, limit = 4) {
  const stories = await getLatestStories({ sectionSlug: story.sectionSlug, limit: limit + 1 });
  return stories.filter((s) => s.id !== story.id).slice(0, limit);
}

export async function getStory(sectionSlug: string, slug: string, lang = "en") {
  const { now, at } = await clock();
  const story = await getStoryCached(at, sectionSlug, slug, lang);
  return story && liveBy([story], now).length ? story : null;
}

async function getStoryCached(at: number, sectionSlug: string, slug: string, lang = "en") {
  "use cache: remote";
  cachedPublic();
  const db = getDb();
  const [story] = await db
    .select({
      ...cardFields,
      body: articleTranslation.body,
      seoTitle: articleTranslation.seoTitle,
      seoDescription: articleTranslation.seoDescription,
      firstPublishedAt: article.firstPublishedAt,
      updatedPublicAt: article.updatedPublicAt,
      youtubeVideoId: article.youtubeVideoId,
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
        isPublic(at),
      ),
    )
    .limit(1);
  if (!story) return null;

  const authors = await db
    .select({
      name: staffProfile.displayName,
      slug: staffProfile.slug,
      jobTitle: staffProfile.jobTitle,
      hasPage: staffProfile.isPublic,
    })
    .from(articleAuthor)
    .innerJoin(staffProfile, eq(staffProfile.userId, articleAuthor.staffId))
    .where(eq(articleAuthor.articleId, story.id))
    .orderBy(articleAuthor.position);

  const tags = await db
    .select({ name: tag.name, slug: tag.slug })
    .from(articleTag)
    .innerJoin(tag, eq(tag.id, articleTag.tagId))
    .where(eq(articleTag.articleId, story.id))
    .orderBy(asc(tag.name));

  const corrections = await db
    .select({ id: articleCorrection.id, body: articleCorrection.body, createdAt: articleCorrection.createdAt })
    .from(articleCorrection)
    .where(eq(articleCorrection.articleId, story.id))
    .orderBy(asc(articleCorrection.createdAt));

  return { ...story, photo: toPhoto(story.photo), authors, tags, corrections };
}

/** Latest corrections on stories readers can see, for the public Corrections page. */
export async function getRecentCorrections(limit = 50, lang = "en") {
  return getRecentCorrectionsCached((await clock()).at, limit, lang);
}

async function getRecentCorrectionsCached(at: number, limit = 50, lang = "en") {
  "use cache: remote";
  cachedPublic();
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
    .where(and(eq(articleTranslation.lang, lang), isPublic(at)))
    .orderBy(desc(articleCorrection.createdAt))
    .limit(limit);
}

/** Lead, Top Stories and Latest: the editor's board with automatic fallbacks. */
export async function getHomepage(lang = "en") {
  const { now, at } = await clock();
  const { placed, newest } = await getHomepageCached(at, lang);
  return assembleHomepage(
    placed.filter((p) => liveBy([p.story], now).length),
    liveBy(newest, now),
    new Date(now),
  );
}

async function getHomepageCached(at: number, lang = "en") {
  "use cache: remote";
  cachedPublic();
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
      .where(and(eq(articleTranslation.lang, lang), isPublic(at))),
    getLatestStoriesCached(at, { limit: 35, lang }),
  ]);
  const placed = slots.map(({ slotZone, slotPosition, slotPinnedUntil, slotOverrideHeadline, ...story }) => ({
    zone: slotZone,
    position: slotPosition,
    pinnedUntil: slotPinnedUntil,
    overrideHeadline: slotOverrideHeadline,
    story: { ...story, photo: toPhoto(story.photo) },
  }));
  return { placed, newest };
}

/** The breaking banner showing right now, if any. */
export async function getActiveBreaking(lang = "en") {
  const { now, at } = await clock();
  const alert = (await getActiveBreakingCached(at, lang)).find(
    (a) => a.startsAt.getTime() <= now && a.expiresAt.getTime() > now,
  );
  return alert ? { id: alert.id, text: alert.text, href: alert.href } : null;
}

async function getActiveBreakingCached(at: number, lang = "en") {
  "use cache: remote";
  cachedPublic();
  // Candidates for this minute; the exact start/expiry check is done outside the cache.
  const alerts = await getDb()
    .select({
      id: breakingAlert.id,
      text: breakingAlert.text,
      articleId: breakingAlert.articleId,
      startsAt: breakingAlert.startsAt,
      expiresAt: breakingAlert.expiresAt,
    })
    .from(breakingAlert)
    .where(and(isNull(breakingAlert.clearedAt), lte(breakingAlert.startsAt, new Date(at)), gt(breakingAlert.expiresAt, new Date(at - 60_000))))
    .orderBy(desc(breakingAlert.startsAt))
    .limit(3);
  return Promise.all(alerts.map(async (alert) => ({ ...alert, href: await breakingLink(alert.articleId, at, lang) })));
}

/** Link only to a story readers can actually open. */
async function breakingLink(articleId: string | null, at: number, lang: string) {
  if (!articleId) return null;

  const [target] = await getDb()
    .select({ slug: articleTranslation.slug, sectionSlug: section.slug })
    .from(article)
    .innerJoin(articleTranslation, eq(articleTranslation.articleId, article.id))
    .innerJoin(section, eq(section.id, article.primarySectionId))
    .where(and(eq(article.id, articleId), eq(articleTranslation.lang, lang), isPublic(at)))
    .limit(1);
  return target ? `/${target.sectionSlug}/${target.slug}` : null;
}

/** A topic tag for its public page. Null when the tag does not exist. */
export async function getTag(slug: string) {
  await connection();
  return getTagCached(slug);
}

async function getTagCached(slug: string) {
  "use cache: remote";
  cachedPublic();
  const [row] = await getDb()
    .select({ id: tag.id, name: tag.name, slug: tag.slug, description: tag.description })
    .from(tag)
    .where(eq(tag.slug, slug))
    .limit(1);
  return row ?? null;
}

/**
 * Every stream on air now (newest first) and the next few scheduled ones (D-043).
 * Several streams can be on air at once, each optionally tagged with a section.
 * A scheduled stream whose start time passed more than 6 hours ago is stale and skipped.
 */
export async function getLiveState() {
  return getLiveStateCached((await clock()).at);
}

const streamSection = alias(section, "stream_section");

async function getLiveStateCached(at: number) {
  "use cache: remote";
  cachedPublic();
  const db = getDb();
  const fields = {
    id: liveStream.id,
    title: liveStream.title,
    youtubeVideoId: liveStream.youtubeVideoId,
    status: liveStream.status,
    scheduledStart: liveStream.scheduledStart,
    startedAt: liveStream.startedAt,
    summary: liveStream.summary,
    keyPoints: liveStream.keyPoints,
    sectionSlug: streamSection.slug,
    sectionName: streamSection.name,
    relatedHeadline: articleTranslation.headline,
    relatedSlug: articleTranslation.slug,
    relatedSection: section.slug,
  };
  // The related story is linked only while readers can see it.
  const related = (q: ReturnType<ReturnType<typeof db.select<typeof fields>>["from"]>) =>
    q
      .leftJoin(streamSection, eq(streamSection.id, liveStream.sectionId))
      .leftJoin(article, and(eq(article.id, liveStream.relatedArticleId), isPublic(at)))
      .leftJoin(articleTranslation, and(eq(articleTranslation.articleId, article.id), eq(articleTranslation.lang, "en")))
      .leftJoin(section, eq(section.id, article.primarySectionId));
  const [onAir, upcoming] = await Promise.all([
    related(db.select(fields).from(liveStream))
      .where(eq(liveStream.status, "live"))
      .orderBy(desc(liveStream.startedAt))
      .limit(12),
    related(db.select(fields).from(liveStream))
      .where(and(eq(liveStream.status, "scheduled"), gt(liveStream.scheduledStart, new Date(at - 6 * 3600_000))))
      .orderBy(asc(liveStream.scheduledStart))
      .limit(5),
  ]);
  return { onAir, upcoming };
}

export type LiveStreamView = Awaited<ReturnType<typeof getLiveState>>["onAir"][number];

/**
 * Stories for sitemaps and RSS: newest first, readers-visible only.
 * `since` limits to recent stories (Google News sitemap: last 48 hours).
 */
export async function getFeedStories(options: { limit?: number; since?: Date; sectionSlug?: string } = {}) {
  const { now, at } = await clock();
  // Rounded to the minute so the 48-hour window shares cache entries too.
  const sinceMs = options.since ? Math.floor(options.since.getTime() / 60_000) * 60_000 : null;
  return liveBy(await getFeedStoriesCached(at, options.limit ?? 50, sinceMs, options.sectionSlug ?? null), now);
}

async function getFeedStoriesCached(at: number, limit: number, sinceMs: number | null, sectionSlug: string | null) {
  "use cache: remote";
  cachedPublic();
  const since = sinceMs === null ? null : new Date(sinceMs);
  const rows = await getDb()
    .select({
      ...cardFields,
      firstPublishedAt: article.firstPublishedAt,
      updatedPublicAt: article.updatedPublicAt,
      youtubeVideoId: article.youtubeVideoId,
    })
    .from(article)
    .innerJoin(articleTranslation, and(eq(articleTranslation.articleId, article.id), eq(articleTranslation.lang, "en")))
    .innerJoin(section, eq(section.id, article.primarySectionId))
    .leftJoin(media, eq(media.id, article.leadMediaId))
    .where(
      and(
        isPublic(at),
        since ? gt(article.publishedAt, since) : undefined,
        sectionSlug ? eq(section.slug, sectionSlug) : undefined,
      ),
    )
    .orderBy(desc(article.publishedAt), desc(article.id))
    .limit(limit);
  return rows.map((row) => ({ ...row, photo: toPhoto(row.photo) }));
}

/** Public author pages and topics that have published stories, for the sitemap. */
export async function getSitemapExtras() {
  return getSitemapExtrasCached((await clock()).at);
}

async function getSitemapExtrasCached(at: number) {
  "use cache: remote";
  cachedPublic();
  const db = getDb();
  const [authors, topics] = await Promise.all([
    db.select({ slug: staffProfile.slug, updatedAt: staffProfile.updatedAt }).from(staffProfile).where(eq(staffProfile.isPublic, true)),
    db
      .selectDistinct({ slug: tag.slug })
      .from(tag)
      .innerJoin(articleTag, eq(articleTag.tagId, tag.id))
      .innerJoin(article, eq(article.id, articleTag.articleId))
      .where(isPublic(at)),
  ]);
  return { authors, topics };
}

/**
 * Full-text search over headlines and standfirsts (PostgreSQL, English stemming,
 * so "price" finds "prices"). Best matches first, then newest.
 */
export async function searchStories(query: string, options: { limit?: number; offset?: number } = {}) {
  const { limit = 20, offset = 0 } = options;
  const q = query.trim().slice(0, 120);
  if (q.length < 2) return [];
  // Searches are nearly all different, so they are not cached.
  const { now, at } = await clock();
  const doc = sql`to_tsvector('english', ${articleTranslation.headline} || ' ' || coalesce(${articleTranslation.standfirst}, ''))`;
  const tsq = sql`websearch_to_tsquery('english', ${q})`;
  const rows = await getDb()
    .select(cardFields)
    .from(article)
    .innerJoin(articleTranslation, and(eq(articleTranslation.articleId, article.id), eq(articleTranslation.lang, "en")))
    .innerJoin(section, eq(section.id, article.primarySectionId))
    .leftJoin(media, eq(media.id, article.leadMediaId))
    .where(and(isPublic(at), sql`${doc} @@ ${tsq}`))
    .orderBy(sql`ts_rank(${doc}, ${tsq}) desc`, desc(article.publishedAt))
    .limit(limit)
    .offset(offset);
  return liveBy(rows.map((row) => ({ ...row, photo: toPhoto(row.photo) })), now);
}
