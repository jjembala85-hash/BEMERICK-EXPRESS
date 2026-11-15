"use server";

import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import {
  article,
  articleAuthor,
  articleTranslation,
  articleType,
  auditLog,
  section,
  staffProfile,
} from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { can } from "@/lib/permissions";
import { parseBody } from "@/lib/rich-text";
import { slugify } from "@/lib/slug";

export type StoryState = { error?: string; message?: string };

type ArticleType = (typeof articleType.enumValues)[number];

async function uniqueSlug(base: string, articleId: string) {
  const db = getDb();
  for (let n = 1; n <= 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const [taken] = await db
      .select({ id: articleTranslation.id })
      .from(articleTranslation)
      .where(
        and(
          eq(articleTranslation.lang, "en"),
          eq(articleTranslation.slug, candidate),
          ne(articleTranslation.articleId, articleId),
        ),
      )
      .limit(1);
    if (!taken) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export async function saveStory(_prev: StoryState, formData: FormData): Promise<StoryState> {
  const staff = await requireStaff("article.create");
  const db = getDb();

  const id = String(formData.get("id") ?? "");
  const intent = String(formData.get("intent") ?? "save");
  const headline = String(formData.get("headline") ?? "").trim();
  const standfirst = String(formData.get("standfirst") ?? "").trim();
  const sectionId = String(formData.get("sectionId") ?? "");
  const typeInput = String(formData.get("type") ?? "news");
  const slugInput = String(formData.get("slug") ?? "").trim();
  const body = parseBody(String(formData.get("body") ?? ""));

  if (!headline) return { error: "Add a headline." };
  if (headline.length > 160) return { error: "The headline is too long (160 characters maximum)." };
  if (!body) return { error: "The story body could not be read. Try again." };
  const type = (articleType.enumValues as string[]).includes(typeInput)
    ? (typeInput as ArticleType)
    : "news";

  const [sectionRow] = await db.select({ id: section.id }).from(section).where(eq(section.id, sectionId)).limit(1);
  if (!sectionRow) return { error: "Choose a section." };

  // Existing story: check the editor is allowed to touch it.
  let existing: { id: string; status: string; createdBy: string; legalHold: boolean; firstPublishedAt: Date | null } | undefined;
  if (id) {
    [existing] = await db
      .select({
        id: article.id,
        status: article.status,
        createdBy: article.createdBy,
        legalHold: article.legalHold,
        firstPublishedAt: article.firstPublishedAt,
      })
      .from(article)
      .where(eq(article.id, id))
      .limit(1);
    if (!existing) return { error: "This story no longer exists." };
    const own = existing.createdBy === staff.id;
    if (!own && !can(staff.role, "article.edit_any")) return { error: "You can only edit your own stories." };
    if (existing.status === "published" && !can(staff.role, "article.publish")) {
      return { error: "Only an editor can change a published story." };
    }
  }

  if (intent === "publish") {
    if (!can(staff.role, "article.publish")) return { error: "You do not have permission to publish." };
    if (existing?.legalHold) return { error: "This story is on legal hold and cannot be published." };
    if (!standfirst) return { error: "Add a standfirst (one-sentence summary) before publishing." };
  }
  if (intent === "unpublish" && !can(staff.role, "article.unpublish")) {
    return { error: "You do not have permission to unpublish." };
  }

  const articleId = existing?.id ?? crypto.randomUUID();
  const now = new Date();

  // The web address is fixed once a story has been published, so shared links never break.
  const slugLocked = Boolean(existing?.firstPublishedAt);
  const slug = slugLocked ? undefined : await uniqueSlug(slugify(slugInput || headline) || "story", articleId);

  const statusChange =
    intent === "publish"
      ? {
          status: "published" as const,
          publishedAt: now,
          firstPublishedAt: existing?.firstPublishedAt ?? now,
          updatedPublicAt: existing?.firstPublishedAt ? now : null,
        }
      : intent === "unpublish"
        ? { status: "unpublished" as const }
        : existing?.status === "published"
          ? { updatedPublicAt: now }
          : {};

  if (!existing) {
    const [profile] = await db
      .select({ userId: staffProfile.userId })
      .from(staffProfile)
      .where(eq(staffProfile.userId, staff.id))
      .limit(1);

    await db.batch([
      db.insert(article).values({
        id: articleId,
        type,
        primarySectionId: sectionRow.id,
        createdBy: staff.id,
        ...statusChange,
      }),
      db.insert(articleTranslation).values({
        articleId,
        lang: "en",
        headline,
        standfirst: standfirst || null,
        body,
        slug: slug!,
      }),
      ...(profile ? [db.insert(articleAuthor).values({ articleId, staffId: staff.id, position: 0 })] : []),
      db.insert(auditLog).values({
        actorId: staff.id,
        action: intent === "publish" ? "article.create_and_publish" : "article.create",
        entity: "article",
        entityId: articleId,
        details: { headline },
      }),
    ]);
    redirect(`/newsroom/stories/${articleId}?saved=${intent === "publish" ? "published" : "created"}`);
  }

  await db.batch([
    db
      .update(article)
      .set({ type, primarySectionId: sectionRow.id, ...statusChange })
      .where(eq(article.id, articleId)),
    db
      .update(articleTranslation)
      .set({ headline, standfirst: standfirst || null, body, ...(slug ? { slug } : {}) })
      .where(and(eq(articleTranslation.articleId, articleId), eq(articleTranslation.lang, "en"))),
    ...(intent === "publish" || intent === "unpublish" || existing.status === "published"
      ? [
          db.insert(auditLog).values({
            actorId: staff.id,
            action:
              intent === "publish"
                ? "article.publish"
                : intent === "unpublish"
                  ? "article.unpublish"
                  : "article.update_published",
            entity: "article",
            entityId: articleId,
            details: { headline, fromStatus: existing.status },
          }),
        ]
      : []),
  ]);

  return {
    message:
      intent === "publish"
        ? "Published. The story is live."
        : intent === "unpublish"
          ? "Unpublished. The story is no longer visible to readers."
          : existing.status === "published"
            ? "Changes saved and live."
            : "Draft saved.",
  };
}
