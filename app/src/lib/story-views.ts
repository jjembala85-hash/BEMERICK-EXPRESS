// Most-read counting (D-048): one daily total per story, nothing about the reader.
// Same rules as the ad counters: obvious robots are not counted.
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { storyView } from "@/db/schema";
import { eatDay } from "@/lib/ad-stats";

export async function recordStoryView(articleId: string) {
  await getDb()
    .insert(storyView)
    .values({ articleId, day: eatDay(), views: 1 })
    .onConflictDoUpdate({ target: [storyView.articleId, storyView.day], set: { views: sql`${storyView.views} + 1` } });
}
