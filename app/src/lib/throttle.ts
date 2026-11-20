// Shared limit for reader sign-ups (alerts, newsletter). Same approach as the
// contact forms: a salted one-way hash of the network address, changed daily,
// kept at most 24 hours. It can count attempts but never be turned back.
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { and, count, eq, gt, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { formThrottle } from "@/db/schema";

async function senderKey(purpose: string) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${process.env.BETTER_AUTH_SECRET ?? ""}|${day}|${purpose}|${ip}`).digest("hex");
}

/** Counts this attempt and says whether it is within `max` per hour. */
export async function withinHourlyLimit(purpose: string, max: number) {
  const db = getDb();
  const key = await senderKey(purpose);
  const [{ n }] = await db
    .select({ n: count() })
    .from(formThrottle)
    .where(and(eq(formThrottle.keyHash, key), gt(formThrottle.createdAt, new Date(Date.now() - 3600_000))));
  if (n >= max) return false;
  await db.batch([
    db.insert(formThrottle).values({ keyHash: key }),
    db.delete(formThrottle).where(lt(formThrottle.createdAt, new Date(Date.now() - 24 * 3600_000))),
  ]);
  return true;
}
