"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { and, count, eq, gt, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { formThrottle, readerMessage } from "@/db/schema";
import { MAX_PER_HOUR, readMessage } from "@/lib/reader-forms";

export type SendState = { error?: string; sent?: boolean };

/**
 * One-way, salted and changed daily: it lets us count messages from the same
 * sender for an hour, but cannot be turned back into an address or linked across days.
 */
async function senderKey() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${process.env.BETTER_AUTH_SECRET ?? ""}|${day}|${ip}`).digest("hex");
}

export async function sendMessage(_prev: SendState, formData: FormData): Promise<SendState> {
  const field = (name: string) => String(formData.get(name) ?? "");
  const result = readMessage({
    kind: field("kind"),
    name: field("name"),
    replyTo: field("replyTo"),
    subject: field("subject"),
    body: field("body"),
    website: field("website"),
    startedAt: field("startedAt"),
  });
  if ("error" in result) return { error: result.error };

  const db = getDb();
  const key = await senderKey();
  const hourAgo = new Date(Date.now() - 3600_000);
  const [{ n }] = await db
    .select({ n: count() })
    .from(formThrottle)
    .where(and(eq(formThrottle.keyHash, key), gt(formThrottle.createdAt, hourAgo)));
  if (n >= MAX_PER_HOUR) return { error: "You have sent several messages in the last hour. Please try again later." };

  await db.batch([
    db.insert(readerMessage).values(result.message),
    db.insert(formThrottle).values({ keyHash: key }),
    // Throttle records are never kept longer than a day.
    db.delete(formThrottle).where(lt(formThrottle.createdAt, new Date(Date.now() - 24 * 3600_000))),
  ]);
  return { sent: true };
}
