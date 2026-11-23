// Newsroom reads for the newsletter (D-044).
import { and, count, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { getDb } from "@/db";
import { article, articleTranslation, newsletterDelivery, newsletterIssue, newsletterSubscriber, section } from "@/db/schema";
import type { EmailStory } from "@/lib/newsletter";

export async function subscriberCounts() {
  const rows = await getDb()
    .select({ status: newsletterSubscriber.status, n: count() })
    .from(newsletterSubscriber)
    .groupBy(newsletterSubscriber.status);
  const of = (s: string) => rows.find((r) => r.status === s)?.n ?? 0;
  return { confirmed: of("confirmed"), pending: of("pending"), unsubscribed: of("unsubscribed") };
}

export async function listIssues() {
  return getDb().select().from(newsletterIssue).orderBy(desc(newsletterIssue.createdAt)).limit(30);
}

export async function getIssue(id: string) {
  const [row] = await getDb().select().from(newsletterIssue).where(eq(newsletterIssue.id, id)).limit(1);
  return row ?? null;
}

export type StoryChoice = EmailStory & { id: string; publishedAt: Date | null };

/** Published stories from the last few days, plus any already chosen (newest first). */
export async function storyChoices(chosen: string[] = [], days = 3): Promise<StoryChoice[]> {
  const since = new Date(Date.now() - days * 86400_000);
  const rows = await getDb()
    .select({
      id: article.id,
      headline: articleTranslation.headline,
      standfirst: articleTranslation.standfirst,
      slug: articleTranslation.slug,
      section: section.name,
      sectionSlug: section.slug,
      publishedAt: article.publishedAt,
    })
    .from(article)
    .innerJoin(articleTranslation, and(eq(articleTranslation.articleId, article.id), eq(articleTranslation.lang, "en")))
    .innerJoin(section, eq(section.id, article.primarySectionId))
    .where(
      and(
        eq(article.status, "published"),
        chosen.length ? or(gt(article.publishedAt, since), inArray(article.id, chosen)) : gt(article.publishedAt, since),
      ),
    )
    .orderBy(desc(article.publishedAt))
    .limit(60);
  return rows.map((r) => ({ id: r.id, headline: r.headline, standfirst: r.standfirst, section: r.section, path: `/${r.sectionSlug}/${r.slug}`, publishedAt: r.publishedAt }));
}

/** The chosen stories in the order the editor picked them. Unpublished ones drop out. */
export async function issueStories(ids: string[]) {
  if (ids.length === 0) return [];
  const choices = await storyChoices(ids, 0);
  const byId = new Map(choices.map((c) => [c.id, c]));
  return ids.map((id) => byId.get(id)).filter((s): s is StoryChoice => Boolean(s));
}

/** Confirmed subscribers who have not been sent this edition yet. */
export async function undeliveredSubscribers(issueId: string) {
  return getDb()
    .select({ id: newsletterSubscriber.id, email: newsletterSubscriber.email })
    .from(newsletterSubscriber)
    .leftJoin(newsletterDelivery, and(eq(newsletterDelivery.subscriberId, newsletterSubscriber.id), eq(newsletterDelivery.issueId, issueId)))
    .where(and(eq(newsletterSubscriber.status, "confirmed"), isNull(newsletterDelivery.subscriberId)));
}
