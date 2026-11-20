"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { and, eq, inArray, isNull, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { article, articleTranslation, auditLog, breakingAlert, homepageSlot, section } from "@/db/schema";
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
  const expiresAt = new Date(now.getTime() + hours * 3600_000);
  await db.batch([
    db
      .update(breakingAlert)
      .set({ clearedAt: now })
      .where(and(isNull(breakingAlert.clearedAt), gt(breakingAlert.expiresAt, now))),
    db.insert(breakingAlert).values({ text, articleId, startsAt: now, expiresAt, createdBy: staff.id }),
    db.insert(auditLog).values({
      actorId: staff.id,
      action: "breaking.start",
      entity: "breaking_alert",
      details: { text, articleId, hours },
    }),
  ]);
  publicContentChanged();
  if (sendAlert) {
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
    message: `Breaking banner is live for ${hours} hour${hours === 1 ? "" : "s"}.${sendAlert ? " The alert is being sent; History shows how many it reached." : ""}`,
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
