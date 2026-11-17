"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { article, auditLog, liveStream } from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { parseEATDateTime } from "@/lib/workflow";
import { parseYouTubeId } from "@/lib/youtube";

export type LiveState = { error?: string; message?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_KEY_POINTS = 12;

type Fields = {
  title: string;
  youtubeVideoId: string;
  summary: string | null;
  scheduledStart: Date | null;
  keyPoints: string[];
  relatedArticleId: string | null;
};

/** Reads and checks the stream form. */
async function readFields(formData: FormData): Promise<Fields | { error: string }> {
  const title = String(formData.get("title") ?? "").trim();
  const youtubeInput = String(formData.get("youtube") ?? "");
  const summary = String(formData.get("summary") ?? "").trim();
  const startInput = String(formData.get("scheduledStart") ?? "");
  const keyPoints = String(formData.get("keyPoints") ?? "")
    .split("\n")
    .map((l) => l.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);
  const relatedInput = String(formData.get("relatedArticleId") ?? "");

  if (title.length < 3 || title.length > 120) return { error: "Give the stream a title (3 to 120 characters)." };
  const youtubeVideoId = parseYouTubeId(youtubeInput);
  if (!youtubeVideoId) return { error: "Paste the YouTube link of the live stream (from its Share button)." };
  if (summary.length > 500) return { error: "The summary is too long (500 characters maximum)." };
  const scheduledStart = startInput ? parseEATDateTime(startInput) : null;
  if (startInput && !scheduledStart) return { error: "The start time is not valid." };
  if (keyPoints.length > MAX_KEY_POINTS) return { error: `Keep it to ${MAX_KEY_POINTS} key points or fewer.` };
  if (keyPoints.some((p) => p.length > 200)) return { error: "Each key point must be 200 characters or fewer." };

  let relatedArticleId: string | null = null;
  if (relatedInput) {
    const [row] = UUID.test(relatedInput)
      ? await getDb().select({ id: article.id }).from(article).where(eq(article.id, relatedInput)).limit(1)
      : [];
    if (!row) return { error: "The related story could not be found." };
    relatedArticleId = row.id;
  }
  return { title, youtubeVideoId, summary: summary || null, scheduledStart, keyPoints, relatedArticleId };
}

/** Only one stream is on air at a time: starting one ends any other. */
function endOthers(db: ReturnType<typeof getDb>, keepId: string, now: Date) {
  return db
    .update(liveStream)
    .set({ status: "ended", endedAt: now, updatedAt: now })
    .where(and(eq(liveStream.status, "live"), ne(liveStream.id, keepId)));
}

export async function createStream(_prev: LiveState, formData: FormData): Promise<LiveState> {
  const staff = await requireStaff("homepage.manage");
  const fields = await readFields(formData);
  if ("error" in fields) return fields;
  const goLive = formData.get("goLive") === "on";
  if (!goLive && !fields.scheduledStart) return { error: "Choose when it starts, or tick “Go live now”." };

  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date();
  await db.batch([
    db.insert(liveStream).values({
      id,
      ...fields,
      status: goLive ? "live" : "scheduled",
      startedAt: goLive ? now : null,
      createdBy: staff.id,
    }),
    ...(goLive ? [endOthers(db, id, now)] : []),
    db.insert(auditLog).values({
      actorId: staff.id,
      action: goLive ? "live.start" : "live.schedule",
      entity: "live_stream",
      entityId: id,
      details: { title: fields.title },
    }),
  ]);
  refresh();
  return { message: goLive ? "You are live. The LIVE pill now shows on every page." : "Stream scheduled. /live shows it as “Next live”." };
}

export async function updateStream(_prev: LiveState, formData: FormData): Promise<LiveState> {
  const staff = await requireStaff("homepage.manage");
  const id = String(formData.get("streamId") ?? "");
  if (!UUID.test(id)) return { error: "This stream no longer exists." };
  const fields = await readFields(formData);
  if ("error" in fields) return fields;
  const db = getDb();
  const updated = await db
    .update(liveStream)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(liveStream.id, id))
    .returning({ id: liveStream.id });
  if (updated.length === 0) return { error: "This stream no longer exists." };
  await db.insert(auditLog).values({
    actorId: staff.id,
    action: "live.update",
    entity: "live_stream",
    entityId: id,
    details: { title: fields.title, keyPoints: fields.keyPoints.length },
  });
  refresh();
  return { message: "Saved. Readers see the change when they open or refresh /live." };
}

/** Go live, end, or delete a stream. */
export async function setStreamStatus(_prev: LiveState, formData: FormData): Promise<LiveState> {
  const staff = await requireStaff("homepage.manage");
  const id = String(formData.get("streamId") ?? "");
  const to = String(formData.get("to") ?? "");
  if (!UUID.test(id)) return { error: "This stream no longer exists." };
  const db = getDb();
  const [row] = await db.select({ status: liveStream.status, title: liveStream.title }).from(liveStream).where(eq(liveStream.id, id)).limit(1);
  if (!row) return { error: "This stream no longer exists." };
  const now = new Date();
  const log = (action: string) =>
    db.insert(auditLog).values({ actorId: staff.id, action, entity: "live_stream", entityId: id, details: { title: row.title } });

  if (to === "live") {
    if (row.status === "live") return {};
    await db.batch([
      endOthers(db, id, now),
      db.update(liveStream).set({ status: "live", startedAt: now, endedAt: null, updatedAt: now }).where(eq(liveStream.id, id)),
      log("live.start"),
    ]);
    redirect("/newsroom/live?done=live");
  }
  if (to === "ended") {
    if (row.status !== "live") return { error: "Only a stream that is on air can be ended." };
    await db.batch([
      db.update(liveStream).set({ status: "ended", endedAt: now, updatedAt: now }).where(eq(liveStream.id, id)),
      log("live.end"),
    ]);
    redirect("/newsroom/live?done=ended");
  }
  if (to === "delete") {
    if (row.status === "live") return { error: "End the stream before deleting it." };
    await db.batch([db.delete(liveStream).where(eq(liveStream.id, id)), log("live.delete")]);
    redirect("/newsroom/live?done=deleted");
  }
  return { error: "Unknown action." };
}
