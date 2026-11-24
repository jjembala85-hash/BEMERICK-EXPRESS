"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { and, eq, inArray, isNull, gt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { article, articleTranslation, auditLog, breakingAlert, homepageSlot, section, sectionPin } from "@/db/schema";
import { pushConfigured, sendAlertToAll } from "@/lib/push";
import { requireStaff } from "@/lib/session";
import { publicContentChanged } from "@/lib/cache";
import { parseEATDateTime } from "@/lib/workflow";
import { BREAKING_DURATIONS, TOP_SLOTS } from "@/lib/homepage";

export type BoardState = { error?: string; message?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PLACES = [
  { zone: "lead", position: 0, label: "Lead" },
  ...Array.from({ length: TOP_SLOTS }, (_, i) => ({ zone: "top", position: i + 1, label: `Top story ${i + 1}` })),
];

/** Replaces the whole board in one go. Empty places fall back to the newest stories. */
export async function saveBoard(_prev: BoardState, formData: FormData): Promise<BoardState> {
  const staff = await requireStaff("homepage.manage");
  const now = new Date();

  const picks: {
    zone: string;
    position: number;
    articleId: string;
    overrideHeadline: string | null;
    pinnedUntil: Date | null;
  }[] = [];
  for (const place of PLACES) {
    const key = `${place.zone}-${place.position}`;
    const articleId = String(formData.get(`${key}-article`) ?? "");
    if (!articleId) continue;
    if (!UUID.test(articleId)) return { error: `${place.label}: choose a story from the list.` };
    const overrideHeadline = String(formData.get(`${key}-headline`) ?? "").trim();
    if (overrideHeadline.length > 120) return { error: `${place.label}: the homepage headline is too long (120 maximum).` };
    const pinInput = String(formData.get(`${key}-until`) ?? "");
    const pinnedUntil = pinInput ? parseEATDateTime(pinInput) : null;
    if (pinInput && !pinnedUntil) return { error: `${place.label}: the "pin until" time is not valid.` };
    if (pinnedUntil && pinnedUntil <= now) return { error: `${place.label}: "pin until" must be in the future.` };
    picks.push({ zone: place.zone, position: place.position, articleId, overrideHeadline: overrideHeadline || null, pinnedUntil });
  }

  const unique = new Set(picks.map((p) => p.articleId));
  if (unique.size !== picks.length) return { error: "The same story is chosen twice. Each story can only take one place." };

  const db = getDb();
  if (picks.length > 0) {
    const live = await db
      .select({ id: article.id })
      .from(article)
      .where(and(inArray(article.id, [...unique]), eq(article.status, "published")));
    if (live.length !== unique.size) return { error: "Only published stories can go on the homepage. Reload the page and try again." };
  }

  await db.batch([
    db.delete(homepageSlot),
    ...(picks.length > 0 ? [db.insert(homepageSlot).values(picks.map((p) => ({ ...p, updatedBy: staff.id })))] : []),
    db.insert(auditLog).values({
      actorId: staff.id,
      action: "homepage.update",
      entity: "homepage",
      details: {
        places: picks.map((p) => ({
          place: `${p.zone}-${p.position}`,
          articleId: p.articleId,
          ...(p.overrideHeadline ? { headline: p.overrideHeadline } : {}),
          ...(p.pinnedUntil ? { until: p.pinnedUntil.toISOString() } : {}),
        })),
      },
    }),
  ]);
  publicContentChanged();
  refresh();
  return { message: "Homepage saved. Readers see it now." };
}

/** Starts a breaking banner (ending any other one first: only one at a time). */
export async function startBreaking(_prev: BoardState, formData: FormData): Promise<BoardState> {
  const staff = await requireStaff("homepage.manage");
  const text = String(formData.get("text") ?? "").trim().replace(/\s+/g, " ");
  const articleInput = String(formData.get("articleId") ?? "");
  const hours = Number(formData.get("hours"));

  if (text.length < 5) return { error: "Write the breaking headline." };
  if (text.length > 140) return { error: "Keep the breaking headline under 140 characters." };
  if (!(BREAKING_DURATIONS as readonly number[]).includes(hours)) return { error: "Choose how long to show it." };
  let articleId: string | null = null;
  let path = "/";
  const db = getDb();
  if (articleInput) {
    const [story] = UUID.test(articleInput)
      ? await db
          .select({ id: article.id, slug: articleTranslation.slug, sectionSlug: section.slug })
          .from(article)
          .innerJoin(articleTranslation, and(eq(articleTranslation.articleId, article.id), eq(articleTranslation.lang, "en")))
          .innerJoin(section, eq(section.id, article.primarySectionId))
          .where(and(eq(article.id, articleInput), eq(article.status, "published")))
          .limit(1)
      : [];
    if (!story) return { error: "The linked story must be published." };
    articleId = story.id;
    path = `/${story.sectionSlug}/${story.slug}`;
  }
  const sendAlert = formData.get("sendAlert") === "on" && pushConfigured();

  const now = new Date();
  const alertId = crypto.randomUUID();
  const expiresAt = new Date(now.getTime() + hours * 3600_000);
  await db.batch([
    db
      .update(breakingAlert)
      .set({ clearedAt: now })
      .where(and(isNull(breakingAlert.clearedAt), gt(breakingAlert.expiresAt, now))),
    db.insert(breakingAlert).values({ id: alertId, text, articleId, startsAt: now, expiresAt, createdBy: staff.id }),
    db.insert(auditLog).values({
      actorId: staff.id,
      action: "breaking.start",
      entity: "breaking_alert",
      details: { text, articleId, hours },
    }),
  ]);
  publicContentChanged();
  // One alert per piece of news: if the same headline was already pushed in the last
  // 10 minutes (a second editor, a double click, a retry), phones are not buzzed again.
  const claimed = sendAlert
    ? await db
        .update(breakingAlert)
        .set({ alertSentAt: now })
        .where(
          and(
            eq(breakingAlert.id, alertId),
            sql`not exists (select 1 from ${breakingAlert} b where b.id <> ${alertId} and b.text = ${text} and b.alert_sent_at > now() - interval '10 minutes')`,
          ),
        )
        .returning({ id: breakingAlert.id })
    : [];
  const alertSkipped = sendAlert && claimed.length === 0;
  if (sendAlert && !alertSkipped) {
    // Sent after the reply, so the editor is not kept waiting; the result goes to History.
    after(async () => {
      const result = await sendAlertToAll({ title: "Breaking · BX News", body: text, path });
      await getDb()
        .insert(auditLog)
        .values({ actorId: staff.id, action: "push.send", entity: "breaking_alert", details: { text, ...result } });
    });
  }
  refresh();
  return {
    message: `Breaking banner is live for ${hours} hour${hours === 1 ? "" : "s"}.${
      alertSkipped
        ? " No second alert was sent: this headline was already sent to phones in the last 10 minutes."
        : sendAlert
          ? " The alert is being sent; History shows how many it reached."
          : ""
    }`,
  };
}

export async function clearBreaking(): Promise<BoardState> {
  const staff = await requireStaff("homepage.manage");
  const now = new Date();
  const db = getDb();
  const cleared = await db
    .update(breakingAlert)
    .set({ clearedAt: now })
    .where(and(isNull(breakingAlert.clearedAt), gt(breakingAlert.expiresAt, now)))
    .returning({ id: breakingAlert.id });
  if (cleared.length > 0) {
    await db.insert(auditLog).values({
      actorId: staff.id,
      action: "breaking.clear",
      entity: "breaking_alert",
      entityId: cleared[0].id,
    });
  }
  publicContentChanged();
  refresh();
  return { message: "Breaking banner removed." };
}

/**
 * Pins one published story to the top of a section's page and header menu (D-048),
 * or clears the pin when no story is chosen. Optional end time (EAT).
 */
export async function pinSection(_prev: BoardState, formData: FormData): Promise<BoardState> {
  const staff = await requireStaff("homepage.manage");
  const sectionId = String(formData.get("sectionId") ?? "");
  const articleInput = String(formData.get("articleId") ?? "");
  const untilInput = String(formData.get("until") ?? "");
  if (!UUID.test(sectionId)) return { error: "Choose a section." };
  const db = getDb();
  const [sec] = await db.select({ id: section.id, name: section.name }).from(section).where(eq(section.id, sectionId)).limit(1);
  if (!sec) return { error: "That section no longer exists." };

  if (!articleInput) {
    const removed = await db.delete(sectionPin).where(eq(sectionPin.sectionId, sec.id)).returning({ id: sectionPin.articleId });
    if (removed.length) {
      await db.insert(auditLog).values({ actorId: staff.id, action: "section.unpin", entity: "article", entityId: removed[0].id, details: { section: sec.name } });
      publicContentChanged();
    }
    refresh();
    return { message: `Nothing is pinned in ${sec.name} now: it shows the newest stories.` };
  }

  const [story] = UUID.test(articleInput)
    ? await db
        .select({ id: article.id, headline: articleTranslation.headline })
        .from(article)
        .innerJoin(articleTranslation, and(eq(articleTranslation.articleId, article.id), eq(articleTranslation.lang, "en")))
        .where(and(eq(article.id, articleInput), eq(article.status, "published")))
        .limit(1)
    : [];
  if (!story) return { error: "Only a published story can be pinned." };
  const pinnedUntil = untilInput ? parseEATDateTime(untilInput) : null;
  if (untilInput && (!pinnedUntil || pinnedUntil <= new Date())) return { error: "The end time must be in the future." };

  await db.batch([
    db
      .insert(sectionPin)
      .values({ sectionId: sec.id, articleId: story.id, pinnedUntil, pinnedBy: staff.id })
      .onConflictDoUpdate({ target: sectionPin.sectionId, set: { articleId: story.id, pinnedUntil, pinnedBy: staff.id, createdAt: new Date() } }),
    db.insert(auditLog).values({
      actorId: staff.id,
      action: "section.pin",
      entity: "article",
      entityId: story.id,
      details: { section: sec.name, headline: story.headline, ...(pinnedUntil ? { until: pinnedUntil.toISOString() } : {}) },
    }),
  ]);
  publicContentChanged();
  refresh();
  return { message: `Pinned in ${sec.name}: “${story.headline}”.` };
}
