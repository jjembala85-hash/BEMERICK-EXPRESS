// Tag queries for the newsroom.
import { asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { articleTag, tag } from "@/db/schema";
import type { TagInput } from "@/lib/tags";

/** Returns tag ids in the order given, creating tags that do not exist yet (matched by slug). */
export async function ensureTags(tags: TagInput[]) {
  if (tags.length === 0) return [];
  const db = getDb();
  await db
    .insert(tag)
    .values(tags.map((t) => ({ name: t.name, slug: t.slug })))
    .onConflictDoNothing({ target: tag.slug });
  const rows = await db
    .select({ id: tag.id, slug: tag.slug })
    .from(tag)
    .where(inArray(tag.slug, tags.map((t) => t.slug)));
  const bySlug = new Map(rows.map((r) => [r.slug, r.id]));
  return tags.map((t) => bySlug.get(t.slug)).filter((id): id is string => Boolean(id));
}

/** Tag names on one story, in name order, joined for the editor's field. */
export async function storyTagText(articleId: string) {
  const rows = await getDb()
    .select({ name: tag.name })
    .from(articleTag)
    .innerJoin(tag, eq(tag.id, articleTag.tagId))
    .where(eq(articleTag.articleId, articleId))
    .orderBy(asc(tag.name));
  return rows.map((r) => r.name).join(", ");
}

/** Every tag with how many stories (any status) use it. */
export async function allTagsWithCounts() {
  return getDb()
    .select({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      description: tag.description,
      stories: sql<number>`(select count(*)::int from ${articleTag} where ${articleTag.tagId} = ${tag.id})`,
    })
    .from(tag)
    .orderBy(asc(tag.name));
}

/** All tag names, for the editor's suggestions. */
export async function tagNames() {
  const rows = await getDb().select({ name: tag.name }).from(tag).orderBy(asc(tag.name)).limit(2000);
  return rows.map((r) => r.name);
}
