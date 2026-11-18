"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import {
  article,
  articleAuthor,
  articleCorrection,
  articleRevision,
  articleTag,
  articleTranslation,
  articleType,
  auditLog,
  editorialNote,
  media,
  section,
  staffProfile,
} from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { publicContentChanged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import { parseBody } from "@/lib/rich-text";
import { slugify } from "@/lib/slug";
import { parseTags, type TagInput } from "@/lib/tags";
import { parseYouTubeId } from "@/lib/youtube";
import { ensureTags } from "@/lib/queries/tags";
import {
  GOES_PUBLIC,
  NOTE_REQUIRED,
  PUBLISH_CHECKLIST,
  canEditContent,
  canTake,
  isStatus,
  nextStatus,
  parseEATDateTime,
  type StoryContext,
  type WorkflowAction,
} from "@/lib/workflow";

export type StoryState = { error?: string; message?: string };

type ArticleType = (typeof articleType.enumValues)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const WORKFLOW_ACTIONS: readonly WorkflowAction[] = [
  "submit",
  "approve",
  "approve_publish",
  "request_changes",
  "spike",
  "restore",
  "publish",
  "schedule",
  "unschedule",
  "unpublish",
];

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

/**
 * Saves a story and, when a workflow button was pressed, moves it to its next
 * status. Every rule is checked here on the server via lib/workflow.
 */
export async function saveStory(_prev: StoryState, formData: FormData): Promise<StoryState> {
  const staff = await requireStaff("article.create");
  const db = getDb();

  const id = String(formData.get("id") ?? "");
  const intentInput = String(formData.get("intent") ?? "save");
  const action = (WORKFLOW_ACTIONS as readonly string[]).includes(intentInput)
    ? (intentInput as WorkflowAction)
    : null;
  if (!action && intentInput !== "save") return { error: "Unknown action. Reload the page and try again." };

  // Existing story: load what the rules need.
  let existing:
    | {
        id: string;
        status: string;
        createdBy: string;
        legalHold: boolean;
        firstPublishedAt: Date | null;
      }
    | undefined;
  if (id) {
    if (!UUID.test(id)) return { error: "This story no longer exists." };
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
    if (!existing || !isStatus(existing.status)) return { error: "This story no longer exists." };
    if (existing.createdBy !== staff.id && !can(staff.role, "article.edit_any")) {
      return { error: "You can only work on your own stories." };
    }
  }

  const ctx: StoryContext = {
    role: staff.role,
    isOwner: existing ? existing.createdBy === staff.id : true,
    status: existing && isStatus(existing.status) ? existing.status : "draft",
    legalHold: existing?.legalHold ?? false,
  };
  const editable = canEditContent(ctx);

  if (action && !canTake(ctx, action)) {
    return ctx.legalHold && GOES_PUBLIC.has(action)
      ? { error: "This story is on legal hold and cannot be published." }
      : { error: "You can't do that to this story at its current stage. Reload the page to see its latest status." };
  }
  if (!action && !editable) {
    return { error: "This story is with an editor, so it can't be changed right now." };
  }

  // Note or reason, for actions that need one.
  const note = String(formData.get("note") ?? "").trim();
  if (action && NOTE_REQUIRED.has(action) && !note) {
    return {
      error:
        action === "request_changes"
          ? "Write a note telling the writer what to change."
          : action === "spike"
            ? "Write a short reason for spiking the story."
            : "Write the reason for unpublishing. It is kept on record.",
    };
  }
  if (note.length > 2000) return { error: "The note is too long (2,000 characters maximum)." };

  // Schedule time, typed in East Africa Time.
  let scheduleAt: Date | null = null;
  if (action === "schedule") {
    scheduleAt = parseEATDateTime(String(formData.get("scheduleAt") ?? ""));
    if (!scheduleAt) return { error: "Choose the date and time to publish." };
    const now = Date.now();
    if (scheduleAt.getTime() < now + 60_000) return { error: "Choose a time at least a minute from now, or publish now." };
    if (scheduleAt.getTime() > now + 365 * 24 * 60 * 60 * 1000) return { error: "Choose a time within the next year." };
  }

  // Story content: read and checked only when this person may change it.
  let content:
    | {
        headline: string;
        standfirst: string;
        body: object;
        sectionId: string;
        type: ArticleType;
        leadMediaId: string | null;
        slugInput: string;
        tags: TagInput[];
        youtubeVideoId: string | null;
      }
    | undefined;
  if (editable) {
    const headline = String(formData.get("headline") ?? "").trim();
    const standfirst = String(formData.get("standfirst") ?? "").trim();
    const sectionId = String(formData.get("sectionId") ?? "");
    const typeInput = String(formData.get("type") ?? "news");
    const slugInput = String(formData.get("slug") ?? "").trim();
    const body = parseBody(String(formData.get("body") ?? ""));
    const leadMediaInput = String(formData.get("leadMediaId") ?? "");

    if (!headline) return { error: "Add a headline." };
    if (headline.length > 160) return { error: "The headline is too long (160 characters maximum)." };
    if (!body) return { error: "The story body could not be read. Try again." };
    const type = (articleType.enumValues as string[]).includes(typeInput) ? (typeInput as ArticleType) : "news";

    const [sectionRow] = UUID.test(sectionId)
      ? await db.select({ id: section.id }).from(section).where(eq(section.id, sectionId)).limit(1)
      : [];
    if (!sectionRow) return { error: "Choose a section." };

    let leadMediaId: string | null = null;
    if (leadMediaInput) {
      const [photo] = UUID.test(leadMediaInput)
        ? await db.select({ id: media.id }).from(media).where(eq(media.id, leadMediaInput)).limit(1)
        : [];
      if (!photo) return { error: "The lead photo could not be found. Remove it and upload it again." };
      leadMediaId = photo.id;
    }
    const parsedTags = parseTags(String(formData.get("tags") ?? ""));
    if ("error" in parsedTags) return { error: parsedTags.error };

    // Video bulletins carry a YouTube link; other story types never do.
    let youtubeVideoId: string | null = null;
    if (type === "bulletin") {
      const youtubeInput = String(formData.get("youtube") ?? "").trim();
      youtubeVideoId = youtubeInput ? parseYouTubeId(youtubeInput) : null;
      if (youtubeInput && !youtubeVideoId) return { error: "That YouTube link was not recognised. Copy the link from the video's Share button." };
    }
    content = { headline, standfirst, body, sectionId: sectionRow.id, type, leadMediaId, slugInput, tags: parsedTags.tags, youtubeVideoId };
  }

  // A standfirst is needed before a story goes to an editor or to readers.
  if (action && (action === "submit" || GOES_PUBLIC.has(action))) {
    const standfirst =
      content?.standfirst ??
      (
        await db
          .select({ standfirst: articleTranslation.standfirst })
          .from(articleTranslation)
          .where(and(eq(articleTranslation.articleId, id), eq(articleTranslation.lang, "en")))
          .limit(1)
      )[0]?.standfirst;
    if (!standfirst) return { error: "Add a standfirst (one-sentence summary) first." };

    // A video bulletin needs its video before an editor or readers see it.
    const video = content
      ? { type: content.type, youtubeVideoId: content.youtubeVideoId }
      : (await db.select({ type: article.type, youtubeVideoId: article.youtubeVideoId }).from(article).where(eq(article.id, id)).limit(1))[0];
    if (video?.type === "bulletin" && !video.youtubeVideoId) return { error: "Add the YouTube link for this video bulletin first." };
  }

  // Pre-publish checklist: every item ticked before readers can see the story.
  const goesPublic = Boolean(action && GOES_PUBLIC.has(action));
  if (goesPublic && PUBLISH_CHECKLIST.some((c) => formData.get(`check_${c.key}`) !== "on")) {
    return { error: "Tick every item on the pre-publish checklist first." };
  }

  const articleId = existing?.id ?? crypto.randomUUID();
  const now = new Date();
  const wasPublished = Boolean(existing?.firstPublishedAt);

  // Keep a copy of the words each time readers get a new version.
  const revisionReason = goesPublic ? "publish" : !action && ctx.status === "published" ? "update" : null;
  const revisionSource =
    revisionReason &&
    (content ??
      (
        await db
          .select({
            headline: articleTranslation.headline,
            standfirst: articleTranslation.standfirst,
            body: articleTranslation.body,
            leadMediaId: article.leadMediaId,
          })
          .from(articleTranslation)
          .innerJoin(article, eq(article.id, articleTranslation.articleId))
          .where(and(eq(articleTranslation.articleId, articleId), eq(articleTranslation.lang, "en")))
          .limit(1)
      )[0]);
  const revisionInsert = () =>
    revisionReason && revisionSource
      ? [
          db.insert(articleRevision).values({
            articleId,
            lang: "en",
            headline: revisionSource.headline,
            standfirst: revisionSource.standfirst || null,
            body: revisionSource.body as object,
            leadMediaId: revisionSource.leadMediaId,
            reason: revisionReason,
            createdBy: staff.id,
          }),
        ]
      : [];

  // The web address is fixed once a story is live or scheduled, so shared links never break.
  const slugLocked = wasPublished || ctx.status === "scheduled";
  const slug =
    content && !slugLocked
      ? await uniqueSlug(slugify(content.slugInput || content.headline) || "story", articleId)
      : undefined;

  const statusChange = (() => {
    if (!action) return ctx.status === "published" ? { updatedPublicAt: now } : {};
    const status = nextStatus(action);
    switch (action) {
      case "publish":
      case "approve_publish":
        return {
          status,
          scheduledAt: null,
          publishedAt: now,
          firstPublishedAt: existing?.firstPublishedAt ?? now,
          updatedPublicAt: wasPublished ? now : null,
        };
      case "schedule":
        // publishedAt is the go-live time; public pages show the story once it passes.
        return { status, scheduledAt: scheduleAt, publishedAt: scheduleAt };
      case "unschedule":
        return { status, scheduledAt: null, ...(wasPublished ? {} : { publishedAt: null }) };
      default:
        return { status };
    }
  })();

  // Publishing straight from a draft skipped review: logged separately (admin only).
  const fastTrack = action === "publish" && (ctx.status === "draft" || ctx.status === "changes_requested");
  const auditAction = action
    ? fastTrack
      ? "article.fast_track_publish"
      : `article.${action}`
    : existing
      ? ctx.status === "published"
        ? "article.update_published"
        : null
      : "article.create";

  // Tags typed for the first time are created; rows are swapped in the batch below.
  const tagIds = content ? await ensureTags(content.tags) : null;
  const tagRows = () =>
    tagIds
      ? [
          db.delete(articleTag).where(eq(articleTag.articleId, articleId)),
          ...(tagIds.length ? [db.insert(articleTag).values(tagIds.map((tagId) => ({ articleId, tagId })))] : []),
        ]
      : [];

  if (!existing) {
    if (!content) return { error: "Add a headline." };
    const [profile] = await db
      .select({ userId: staffProfile.userId })
      .from(staffProfile)
      .where(eq(staffProfile.userId, staff.id))
      .limit(1);

    await db.batch([
      db.insert(article).values({
        id: articleId,
        type: content.type,
        primarySectionId: content.sectionId,
        leadMediaId: content.leadMediaId,
        youtubeVideoId: content.youtubeVideoId,
        createdBy: staff.id,
        ...statusChange,
      }),
      db.insert(articleTranslation).values({
        articleId,
        lang: "en",
        headline: content.headline,
        standfirst: content.standfirst || null,
        body: content.body,
        slug: slug!,
      }),
      ...(profile ? [db.insert(articleAuthor).values({ articleId, staffId: staff.id, position: 0 })] : []),
      ...tagRows(),
      ...revisionInsert(),
      db.insert(auditLog).values({
        actorId: staff.id,
        action: action ? `article.create_and_${action}` : "article.create",
        entity: "article",
        entityId: articleId,
        details: { headline: content.headline, ...(goesPublic ? { checklist: "all items confirmed" } : {}) },
      }),
    ]);
    publicContentChanged();
    redirect(`/newsroom/stories/${articleId}?saved=${action ?? "created"}`);
  }

  await db.batch([
    db
      .update(article)
      .set({
        ...(content
          ? {
              type: content.type,
              primarySectionId: content.sectionId,
              leadMediaId: content.leadMediaId,
              youtubeVideoId: content.youtubeVideoId,
            }
          : {}),
        ...statusChange,
      })
      .where(eq(article.id, articleId)),
    ...(content
      ? [
          db
            .update(articleTranslation)
            .set({
              headline: content.headline,
              standfirst: content.standfirst || null,
              body: content.body,
              ...(slug ? { slug } : {}),
            })
            .where(and(eq(articleTranslation.articleId, articleId), eq(articleTranslation.lang, "en"))),
        ]
      : []),
    ...tagRows(),
    ...revisionInsert(),
    ...(note && action
      ? [db.insert(editorialNote).values({ articleId, authorId: staff.id, kind: action, body: note })]
      : []),
    ...(auditAction
      ? [
          db.insert(auditLog).values({
            actorId: staff.id,
            action: auditAction,
            entity: "article",
            entityId: articleId,
            details: {
              fromStatus: ctx.status,
              ...(action ? { toStatus: nextStatus(action) } : {}),
              ...(scheduleAt ? { scheduledFor: scheduleAt.toISOString() } : {}),
              ...(note ? { note } : {}),
              ...(goesPublic ? { checklist: "all items confirmed" } : {}),
            },
          }),
        ]
      : []),
  ]);

  publicContentChanged();
  // Status changed: reload so the buttons, notes and read-only state match the new stage.
  if (action) redirect(`/newsroom/stories/${articleId}?saved=${action}`);
  return { message: ctx.status === "published" ? "Changes saved and live." : "Draft saved." };
}

export type NoteState = { error?: string; ok?: number };

/** A general comment on a story, visible to everyone who can open it in the newsroom. */
export async function addNote(prev: NoteState, formData: FormData): Promise<NoteState> {
  const staff = await requireStaff("article.create");
  const articleId = String(formData.get("articleId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write the note first." };
  if (body.length > 2000) return { error: "The note is too long (2,000 characters maximum)." };
  if (!UUID.test(articleId)) return { error: "This story no longer exists." };

  const db = getDb();
  const [story] = await db
    .select({ createdBy: article.createdBy })
    .from(article)
    .where(eq(article.id, articleId))
    .limit(1);
  if (!story) return { error: "This story no longer exists." };
  if (story.createdBy !== staff.id && !can(staff.role, "article.edit_any")) {
    return { error: "You can only comment on your own stories." };
  }

  await db.insert(editorialNote).values({ articleId, authorId: staff.id, kind: "note", body });
  publicContentChanged();
  refresh();
  return { ok: (prev.ok ?? 0) + 1 };
}

export type SafetyState = { error?: string; ok?: number };

/**
 * Legal hold: anyone working on a story can flag it for legal review; only an
 * admin can clear it. While flagged, it cannot be published or scheduled.
 */
export async function setLegalHold(prev: SafetyState, formData: FormData): Promise<SafetyState> {
  const staff = await requireStaff("article.create");
  const articleId = String(formData.get("articleId") ?? "");
  const on = formData.get("on") === "true";
  const reason = String(formData.get("reason") ?? "").trim();
  if (!UUID.test(articleId)) return { error: "This story no longer exists." };
  if (reason.length > 2000) return { error: "The reason is too long (2,000 characters maximum)." };

  const db = getDb();
  const [story] = await db
    .select({ createdBy: article.createdBy, legalHold: article.legalHold, status: article.status })
    .from(article)
    .where(eq(article.id, articleId))
    .limit(1);
  if (!story) return { error: "This story no longer exists." };
  if (story.createdBy !== staff.id && !can(staff.role, "article.edit_any")) {
    return { error: "You can only flag your own stories." };
  }
  if (!on && !can(staff.role, "legal.clear")) return { error: "Only an administrator can clear a legal hold." };
  if (on && !reason) return { error: "Say briefly what needs legal review." };
  if (story.legalHold === on) return { ok: (prev.ok ?? 0) + 1 };

  await db.batch([
    db.update(article).set({ legalHold: on }).where(eq(article.id, articleId)),
    db.insert(editorialNote).values({
      articleId,
      authorId: staff.id,
      kind: on ? "legal_hold" : "legal_clear",
      body: reason || "Legal hold cleared.",
    }),
    db.insert(auditLog).values({
      actorId: staff.id,
      action: on ? "article.legal_hold" : "article.legal_clear",
      entity: "article",
      entityId: articleId,
      details: { status: story.status, ...(reason ? { reason } : {}) },
    }),
  ]);
  publicContentChanged();
  refresh();
  return { ok: (prev.ok ?? 0) + 1 };
}

/** Adds a dated, public correction to a story that has been published. */
export async function addCorrection(prev: SafetyState, formData: FormData): Promise<SafetyState> {
  const staff = await requireStaff("corrections.manage");
  const articleId = String(formData.get("articleId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!UUID.test(articleId)) return { error: "This story no longer exists." };
  if (body.length < 10) return { error: "Write the correction in full: what was wrong and what is right." };
  if (body.length > 1000) return { error: "The correction is too long (1,000 characters maximum)." };

  const db = getDb();
  const [story] = await db
    .select({
      firstPublishedAt: article.firstPublishedAt,
      leadMediaId: article.leadMediaId,
      headline: articleTranslation.headline,
      standfirst: articleTranslation.standfirst,
      body: articleTranslation.body,
    })
    .from(article)
    .innerJoin(articleTranslation, and(eq(articleTranslation.articleId, article.id), eq(articleTranslation.lang, "en")))
    .where(eq(article.id, articleId))
    .limit(1);
  if (!story) return { error: "This story no longer exists." };
  if (!story.firstPublishedAt) return { error: "Only stories that have been published can be corrected." };

  await db.batch([
    db.insert(articleCorrection).values({ articleId, body, createdBy: staff.id }),
    db.update(article).set({ updatedPublicAt: new Date() }).where(eq(article.id, articleId)),
    db.insert(articleRevision).values({
      articleId,
      lang: "en",
      headline: story.headline,
      standfirst: story.standfirst,
      body: story.body as object,
      leadMediaId: story.leadMediaId,
      reason: "correction",
      createdBy: staff.id,
    }),
    db.insert(auditLog).values({
      actorId: staff.id,
      action: "article.correction",
      entity: "article",
      entityId: articleId,
      details: { correction: body },
    }),
  ]);
  publicContentChanged();
  refresh();
  return { ok: (prev.ok ?? 0) + 1 };
}
