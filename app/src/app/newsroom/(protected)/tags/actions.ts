"use server";

import { refresh } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { articleTag, auditLog, tag } from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { MAX_TAG_LENGTH } from "@/lib/tags";
import { slugify } from "@/lib/slug";

export type TagState = { error?: string; message?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findTag(id: string) {
  if (!UUID.test(id)) return null;
  const [row] = await getDb().select({ id: tag.id, name: tag.name, slug: tag.slug }).from(tag).where(eq(tag.id, id)).limit(1);
  return row ?? null;
}

/** Renames a tag or changes its description. The web address stays the same, so shared links keep working. */
export async function updateTag(_prev: TagState, formData: FormData): Promise<TagState> {
  const staff = await requireStaff("tags.manage");
  const row = await findTag(String(formData.get("tagId") ?? ""));
  if (!row) return { error: "This tag no longer exists." };
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const description = String(formData.get("description") ?? "").trim();
  if (slugify(name).length < 2) return { error: "Enter a tag name with words or numbers." };
  if (name.length > MAX_TAG_LENGTH) return { error: `The name is too long (${MAX_TAG_LENGTH} characters maximum).` };
  if (description.length > 300) return { error: "The description is too long (300 characters maximum)." };

  const db = getDb();
  await db.batch([
    db.update(tag).set({ name, description: description || null, updatedAt: new Date() }).where(eq(tag.id, row.id)),
    db.insert(auditLog).values({
      actorId: staff.id,
      action: "tag.update",
      entity: "tag",
      entityId: row.id,
      details: row.name === name ? {} : { nameBefore: row.name, nameAfter: name },
    }),
  ]);
  refresh();
  return { message: `Saved “${name}”.` };
}

/** Moves every story from one tag to another, then removes the first tag. */
export async function mergeTag(_prev: TagState, formData: FormData): Promise<TagState> {
  const staff = await requireStaff("tags.manage");
  const from = await findTag(String(formData.get("tagId") ?? ""));
  const into = await findTag(String(formData.get("intoId") ?? ""));
  if (!from) return { error: "This tag no longer exists." };
  if (!into) return { error: "Choose the tag to merge into." };
  if (from.id === into.id) return { error: "Choose a different tag to merge into." };

  const db = getDb();
  await db.batch([
    db
      .insert(articleTag)
      .select(
        db
          .select({ articleId: articleTag.articleId, tagId: sql<string>`${into.id}::uuid`.as("tag_id") })
          .from(articleTag)
          .where(eq(articleTag.tagId, from.id)),
      )
      .onConflictDoNothing(),
    db.delete(tag).where(eq(tag.id, from.id)),
    db.insert(auditLog).values({
      actorId: staff.id,
      action: "tag.merge",
      entity: "tag",
      entityId: into.id,
      details: { merged: from.name, mergedSlug: from.slug, into: into.name },
    }),
  ]);
  refresh();
  return { message: `Merged “${from.name}” into “${into.name}”. Its old topic page now shows “Page not found”.` };
}

/** Removes a tag from every story and deletes it. Stories themselves are not changed otherwise. */
export async function deleteTag(_prev: TagState, formData: FormData): Promise<TagState> {
  const staff = await requireStaff("tags.manage");
  const row = await findTag(String(formData.get("tagId") ?? ""));
  if (!row) return { error: "This tag no longer exists." };
  const db = getDb();
  await db.batch([
    db.delete(tag).where(eq(tag.id, row.id)),
    db.insert(auditLog).values({
      actorId: staff.id,
      action: "tag.delete",
      entity: "tag",
      entityId: row.id,
      details: { name: row.name, slug: row.slug },
    }),
  ]);
  refresh();
  return { message: `Deleted “${row.name}”.` };
}
