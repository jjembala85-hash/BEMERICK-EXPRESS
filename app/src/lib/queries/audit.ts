// Audit log reading for the newsroom History page. The log is append-only:
// nothing in the app edits or deletes it.
import { and, desc, eq, gte, like, lt, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import { articleTranslation, auditLog, media, tag, user } from "@/db/schema";
import { AUDIT_AREAS, type AuditArea } from "@/lib/audit";

export const AUDIT_PAGE_SIZE = 50;

/** "2026-11-17" (a day in East Africa Time) -> the instant that day starts. */
export function eatDayStart(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(`${day}T00:00:00+03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type AuditFilters = {
  area?: AuditArea;
  actorId?: string;
  articleId?: string;
  from?: Date;
  /** Exclusive end (start of the day after the chosen "to" day). */
  before?: Date;
  page?: number;
};

export async function getAuditEntries(filters: AuditFilters) {
  const actor = alias(user, "actor");
  const subjectUser = alias(user, "subject_user");
  const conditions: (SQL | undefined)[] = [
    filters.area ? or(...AUDIT_AREAS[filters.area].prefixes.map((p) => like(auditLog.action, `${p}%`))) : undefined,
    filters.actorId ? eq(auditLog.actorId, filters.actorId) : undefined,
    filters.articleId ? and(eq(auditLog.entity, "article"), eq(auditLog.entityId, filters.articleId)) : undefined,
    filters.from ? gte(auditLog.createdAt, filters.from) : undefined,
    filters.before ? lt(auditLog.createdAt, filters.before) : undefined,
  ];
  const page = Math.max(1, filters.page ?? 1);

  const rows = await getDb()
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      details: auditLog.details,
      createdAt: auditLog.createdAt,
      actorName: actor.name,
      headline: articleTranslation.headline,
      photoCredit: media.credit,
      tagName: tag.name,
      tagSlug: tag.slug,
      personName: subjectUser.name,
    })
    .from(auditLog)
    .leftJoin(actor, eq(actor.id, auditLog.actorId))
    .leftJoin(
      articleTranslation,
      and(
        eq(auditLog.entity, "article"),
        eq(sql`${articleTranslation.articleId}::text`, auditLog.entityId),
        eq(articleTranslation.lang, "en"),
      ),
    )
    .leftJoin(media, and(eq(auditLog.entity, "media"), eq(sql`${media.id}::text`, auditLog.entityId)))
    .leftJoin(tag, and(eq(auditLog.entity, "tag"), eq(sql`${tag.id}::text`, auditLog.entityId)))
    .leftJoin(subjectUser, and(eq(auditLog.entity, "user"), eq(subjectUser.id, auditLog.entityId)))
    .where(and(...conditions))
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(AUDIT_PAGE_SIZE + 1)
    .offset((page - 1) * AUDIT_PAGE_SIZE);

  return { entries: rows.slice(0, AUDIT_PAGE_SIZE), hasMore: rows.length > AUDIT_PAGE_SIZE };
}

export type AuditEntry = Awaited<ReturnType<typeof getAuditEntries>>["entries"][number];

/** Everyone who has an account, for the "Person" filter. */
export async function auditPeople() {
  return getDb().select({ id: user.id, name: user.name }).from(user).orderBy(user.name);
}
