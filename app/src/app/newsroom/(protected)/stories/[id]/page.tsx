import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  article,
  articleCorrection,
  articleRevision,
  articleTranslation,
  editorialNote,
  media,
  section,
  user,
} from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { can } from "@/lib/permissions";
import { isStorageReady, mediaUrl, smallestKey } from "@/lib/media";
import { formatEAT } from "@/lib/dates";
import { actionMessages, availableActions, canEditContent, isStatus, type WorkflowAction } from "@/lib/workflow";
import { StoryForm } from "@/components/newsroom/story-form";
import { StoryNotes } from "@/components/newsroom/story-notes";
import { StorySafety } from "@/components/newsroom/story-safety";
import { storyTagText, tagNames } from "@/lib/queries/tags";
import { watchUrl } from "@/lib/youtube";

export const metadata: Metadata = { title: "Edit story" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const flashMessages: Record<string, string> = {
  ...(actionMessages as Record<WorkflowAction, string>),
  created: "Draft saved.",
};

export default async function EditStoryPage({
  params,
  searchParams,
}: PageProps<"/newsroom/stories/[id]">) {
  const staff = await requireStaff("article.create");
  const { id } = await params;
  const saved = (await searchParams).saved;
  if (!UUID.test(id)) notFound();

  const db = getDb();
  const [story] = await db
    .select({
      id: article.id,
      status: article.status,
      type: article.type,
      sectionId: article.primarySectionId,
      createdBy: article.createdBy,
      legalHold: article.legalHold,
      youtubeVideoId: article.youtubeVideoId,
      firstPublishedAt: article.firstPublishedAt,
      scheduledAt: article.scheduledAt,
      headline: articleTranslation.headline,
      standfirst: articleTranslation.standfirst,
      slug: articleTranslation.slug,
      body: articleTranslation.body,
      sectionSlug: section.slug,
      photo: {
        id: media.id,
        r2Key: media.r2Key,
        variants: media.variants,
        altText: media.altText,
        credit: media.credit,
        caption: media.caption,
      },
    })
    .from(article)
    .innerJoin(articleTranslation, and(eq(articleTranslation.articleId, article.id), eq(articleTranslation.lang, "en")))
    .innerJoin(section, eq(section.id, article.primarySectionId))
    .leftJoin(media, eq(media.id, article.leadMediaId))
    .where(eq(article.id, id))
    .limit(1);

  if (!story || !isStatus(story.status)) notFound();
  if (story.createdBy !== staff.id && !can(staff.role, "article.edit_any")) notFound();

  const ctx = {
    role: staff.role,
    isOwner: story.createdBy === staff.id,
    status: story.status,
    legalHold: story.legalHold,
  };

  // The smallest stored size is enough for the editor preview.
  const previewKey = story.photo ? smallestKey(story.photo) : null;

  const [sections, notes, corrections, revisions, tagText, tagSuggestions] = await Promise.all([
    db
      .select({ id: section.id, name: section.name })
      .from(section)
      .where(eq(section.isActive, true))
      .orderBy(section.sortOrder),
    db
      .select({
        id: editorialNote.id,
        kind: editorialNote.kind,
        body: editorialNote.body,
        createdAt: editorialNote.createdAt,
        author: user.name,
      })
      .from(editorialNote)
      .innerJoin(user, eq(user.id, editorialNote.authorId))
      .where(eq(editorialNote.articleId, story.id))
      .orderBy(asc(editorialNote.createdAt)),
    db
      .select({ id: articleCorrection.id, body: articleCorrection.body, createdAt: articleCorrection.createdAt, author: user.name })
      .from(articleCorrection)
      .innerJoin(user, eq(user.id, articleCorrection.createdBy))
      .where(eq(articleCorrection.articleId, story.id))
      .orderBy(asc(articleCorrection.createdAt)),
    db
      .select({
        id: articleRevision.id,
        reason: articleRevision.reason,
        headline: articleRevision.headline,
        createdAt: articleRevision.createdAt,
        author: user.name,
      })
      .from(articleRevision)
      .leftJoin(user, eq(user.id, articleRevision.createdBy))
      .where(eq(articleRevision.articleId, story.id))
      .orderBy(desc(articleRevision.createdAt))
      .limit(100),
    storyTagText(story.id),
    tagNames(),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/newsroom/stories" className="text-sm font-semibold text-lake-ink hover:underline">← Stories</Link>
        <span className="flex flex-wrap gap-4">
          {can(staff.role, "audit.view") && (
            <Link href={`/newsroom/audit?story=${story.id}`} className="text-sm font-semibold text-lake-ink hover:underline">
              History
            </Link>
          )}
          {story.status === "published" && (
            <Link href={`/${story.sectionSlug}/${story.slug}`} className="text-sm font-semibold text-lake-ink hover:underline">
              View live story →
            </Link>
          )}
        </span>
      </div>
      <h1 className="mb-6 mt-2 font-serif text-3xl font-bold text-ink">
        {canEditContent(ctx) ? "Edit story" : "Story"}
      </h1>
      <StoryForm
        key={`${story.id}-${story.status}`}
        values={{
          id: story.id,
          status: story.status,
          headline: story.headline,
          standfirst: story.standfirst ?? "",
          sectionId: story.sectionId,
          type: story.type,
          slug: story.slug,
          body: story.body,
          slugLocked: Boolean(story.firstPublishedAt) || story.status === "scheduled",
          legalHold: story.legalHold,
          tags: tagText,
          youtube: story.youtubeVideoId ? watchUrl(story.youtubeVideoId) : "",
          scheduledLabel:
            story.status === "scheduled" && story.scheduledAt ? `Goes live ${formatEAT(story.scheduledAt)}` : undefined,
          leadPhoto:
            story.photo && previewKey
              ? {
                  id: story.photo.id,
                  previewUrl: mediaUrl(previewKey),
                  altText: story.photo.altText,
                  credit: story.photo.credit,
                  caption: story.photo.caption,
                }
              : null,
        }}
        sections={sections}
        actions={availableActions(ctx)}
        editable={canEditContent(ctx)}
        storageReady={isStorageReady()}
        tagSuggestions={tagSuggestions}
        flash={typeof saved === "string" ? flashMessages[saved] : undefined}
      />
      <StorySafety
        articleId={story.id}
        legalHold={story.legalHold}
        canClearHold={can(staff.role, "legal.clear")}
        canCorrect={can(staff.role, "corrections.manage")}
        published={Boolean(story.firstPublishedAt)}
        corrections={corrections.map((c) => ({ id: c.id, body: c.body, author: c.author, when: formatEAT(c.createdAt) }))}
        revisions={revisions.map((r) => ({ id: r.id, reason: r.reason, headline: r.headline, author: r.author, when: formatEAT(r.createdAt) }))}
      />
      <StoryNotes
        articleId={story.id}
        notes={notes.map((n) => ({ id: n.id, kind: n.kind, body: n.body, author: n.author, when: formatEAT(n.createdAt) }))}
      />
    </>
  );
}
