// Scheduled publishing without a cron job (D-027).
// Readers see a scheduled story as soon as its time passes, because public
// queries treat "scheduled and due" as live. This function then tidies the
// record into a normal published story; it runs on every newsroom visit and is
// safe to run any number of times (the WHERE clause only matches due stories).
import { and, eq, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { article, auditLog } from "@/db/schema";

export async function publishDueStories() {
  const db = getDb();
  const promoted = await db
    .update(article)
    .set({
      status: "published",
      scheduledAt: null,
      firstPublishedAt: sql`coalesce(${article.firstPublishedAt}, ${article.publishedAt})`,
    })
    .where(and(eq(article.status, "scheduled"), lte(article.publishedAt, new Date())))
    .returning({ id: article.id, publishedAt: article.publishedAt });

  if (promoted.length > 0) {
    await db.insert(auditLog).values(
      promoted.map((p) => ({
        actorId: null,
        action: "article.publish_scheduled",
        entity: "article",
        entityId: p.id,
        details: { publishedAt: p.publishedAt?.toISOString() },
      })),
    );
  }
  return promoted.length;
}
