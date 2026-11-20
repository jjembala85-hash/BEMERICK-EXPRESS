// Newsroom reads for direct-sold ads (D-044). Admin pages only.
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { ad, adStat, media } from "@/db/schema";
import { mediaUrl, smallestKey } from "@/lib/media";
import { eatDay } from "@/lib/ad-stats";

/** Every ad with its totals: all time and the last 30 days. */
export async function listAds() {
  const since = eatDay(new Date(Date.now() - 29 * 86400_000));
  const rows = await getDb()
    .select({
      id: ad.id,
      advertiser: ad.advertiser,
      campaign: ad.campaign,
      slots: ad.slots,
      startsAt: ad.startsAt,
      endsAt: ad.endsAt,
      paused: ad.paused,
      r2Key: media.r2Key,
      variants: media.variants,
      views: sql<number>`coalesce((select sum(${adStat.views}) from ${adStat} where ${adStat.adId} = ${ad.id}), 0)::int`,
      clicks: sql<number>`coalesce((select sum(${adStat.clicks}) from ${adStat} where ${adStat.adId} = ${ad.id}), 0)::int`,
      views30: sql<number>`coalesce((select sum(${adStat.views}) from ${adStat} where ${adStat.adId} = ${ad.id} and ${adStat.day} >= ${since}), 0)::int`,
      clicks30: sql<number>`coalesce((select sum(${adStat.clicks}) from ${adStat} where ${adStat.adId} = ${ad.id} and ${adStat.day} >= ${since}), 0)::int`,
    })
    .from(ad)
    .innerJoin(media, eq(media.id, ad.mediaId))
    .orderBy(desc(ad.startsAt));
  return rows.map(({ r2Key, variants, ...r }) => ({ ...r, thumb: mediaUrl(smallestKey({ r2Key, variants })) }));
}

export async function getAdForEditing(id: string) {
  const [row] = await getDb()
    .select({
      id: ad.id,
      advertiser: ad.advertiser,
      campaign: ad.campaign,
      linkUrl: ad.linkUrl,
      slots: ad.slots,
      startsAt: ad.startsAt,
      endsAt: ad.endsAt,
      paused: ad.paused,
      createdAt: ad.createdAt,
      photoId: media.id,
      r2Key: media.r2Key,
      variants: media.variants,
      altText: media.altText,
      credit: media.credit,
      caption: media.caption,
    })
    .from(ad)
    .innerJoin(media, eq(media.id, ad.mediaId))
    .where(eq(ad.id, id))
    .limit(1);
  if (!row) return null;
  const { photoId, r2Key, variants, altText, credit, caption, ...rest } = row;
  return { ...rest, photo: { id: photoId, previewUrl: mediaUrl(smallestKey({ r2Key, variants })), altText, credit, caption } };
}

/** Day-by-day numbers, newest first (for the advertiser report). */
export async function adDailyStats(id: string, days = 90) {
  const since = eatDay(new Date(Date.now() - (days - 1) * 86400_000));
  return getDb()
    .select({ day: adStat.day, views: adStat.views, clicks: adStat.clicks })
    .from(adStat)
    .where(and(eq(adStat.adId, id), gte(adStat.day, since)))
    .orderBy(desc(adStat.day));
}
