// Daily view and click totals per ad (D-044). Only counts are stored: no IP
// address, cookie or device detail. Obvious bots are not counted.
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { adStat } from "@/db/schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAdId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/** Crawlers, link previews and monitors fetch pages too; they are not readers. */
export function isBot(userAgent: string | null) {
  if (!userAgent) return true;
  return /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|monitor|uptime|headless|lighthouse|curl|wget|python|node-fetch|axios/i.test(
    userAgent,
  );
}

/** The calendar day in Kampala (EAT, UTC+3), as YYYY-MM-DD. */
export function eatDay(date = new Date()) {
  return new Date(date.getTime() + 3 * 3600_000).toISOString().slice(0, 10);
}

export async function recordAdEvent(adId: string, kind: "views" | "clicks") {
  const day = eatDay();
  const row = kind === "views" ? { adId, day, views: 1 } : { adId, day, clicks: 1 };
  await getDb()
    .insert(adStat)
    .values(row)
    .onConflictDoUpdate({
      target: [adStat.adId, adStat.day],
      set: kind === "views" ? { views: sql`${adStat.views} + 1` } : { clicks: sql`${adStat.clicks} + 1` },
    });
}
