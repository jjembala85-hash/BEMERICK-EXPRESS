"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { ad, auditLog, media } from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { publicContentChanged } from "@/lib/cache";
import { parseEATDateTime } from "@/lib/workflow";
import { isAdSlot, parseAdLink, type AdSlot } from "@/lib/ads";

export type AdFormState = { error?: string; message?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function readFields(formData: FormData) {
  const advertiser = String(formData.get("advertiser") ?? "").trim();
  const campaign = String(formData.get("campaign") ?? "").trim();
  const linkUrl = parseAdLink(String(formData.get("linkUrl") ?? ""));
  const slots = [...new Set(formData.getAll("slots").map(String))].filter(isAdSlot) as AdSlot[];
  const startInput = String(formData.get("startsAt") ?? "");
  const endInput = String(formData.get("endsAt") ?? "");
  const mediaInput = String(formData.get("mediaId") ?? "");

  if (advertiser.length < 2 || advertiser.length > 80) return { error: "Enter the advertiser's name (2 to 80 characters)." };
  if (campaign.length < 2 || campaign.length > 80) return { error: "Name the campaign (2 to 80 characters), e.g. “December sale”." };
  if (!linkUrl) return { error: "Enter the advertiser's web address. It must start with https://." };
  if (slots.length === 0) return { error: "Choose at least one place for the ad to appear." };
  const startsAt = startInput ? parseEATDateTime(startInput) : new Date();
  if (!startsAt) return { error: "The start date is not valid." };
  const endsAt = endInput ? parseEATDateTime(endInput) : null;
  if (endInput && !endsAt) return { error: "The end date is not valid." };
  if (endsAt && endsAt <= startsAt) return { error: "The end date must be after the start date." };

  const [photo] = UUID.test(mediaInput) ? await getDb().select({ id: media.id }).from(media).where(eq(media.id, mediaInput)).limit(1) : [];
  if (!photo) return { error: "Add the banner image (upload it or choose it from the library)." };
  return { advertiser, campaign, linkUrl, slots, startsAt, endsAt, mediaId: photo.id };
}

export async function createAd(_prev: AdFormState, formData: FormData): Promise<AdFormState> {
  const staff = await requireStaff("ads.manage");
  const fields = await readFields(formData);
  if ("error" in fields) return { error: fields.error };
  const db = getDb();
  const id = crypto.randomUUID();
  await db.batch([
    db.insert(ad).values({ id, ...fields, createdBy: staff.id }),
    db.insert(auditLog).values({
      actorId: staff.id,
      action: "ad.create",
      entity: "ad",
      entityId: id,
      details: { advertiser: fields.advertiser, campaign: fields.campaign },
    }),
  ]);
  publicContentChanged();
  redirect(`/newsroom/ads/${id}?done=created`);
}

export async function updateAd(_prev: AdFormState, formData: FormData): Promise<AdFormState> {
  const staff = await requireStaff("ads.manage");
  const id = String(formData.get("adId") ?? "");
  if (!UUID.test(id)) return { error: "This ad no longer exists." };
  const fields = await readFields(formData);
  if ("error" in fields) return { error: fields.error };
  const db = getDb();
  const updated = await db.update(ad).set({ ...fields, updatedAt: new Date() }).where(eq(ad.id, id)).returning({ id: ad.id });
  if (updated.length === 0) return { error: "This ad no longer exists." };
  await db.insert(auditLog).values({
    actorId: staff.id,
    action: "ad.update",
    entity: "ad",
    entityId: id,
    details: { advertiser: fields.advertiser, campaign: fields.campaign },
  });
  publicContentChanged();
  refresh();
  return { message: "Saved. Readers see the change on their next visit." };
}

/** Pause, resume or delete. */
export async function setAdStatus(_prev: AdFormState, formData: FormData): Promise<AdFormState> {
  const staff = await requireStaff("ads.manage");
  const id = String(formData.get("adId") ?? "");
  const to = String(formData.get("to") ?? "");
  if (!UUID.test(id)) return { error: "This ad no longer exists." };
  const db = getDb();
  const [row] = await db.select({ advertiser: ad.advertiser, campaign: ad.campaign }).from(ad).where(eq(ad.id, id)).limit(1);
  if (!row) return { error: "This ad no longer exists." };
  const log = (action: string) =>
    db.insert(auditLog).values({ actorId: staff.id, action, entity: "ad", entityId: id, details: { advertiser: row.advertiser, campaign: row.campaign } });

  if (to === "pause" || to === "resume") {
    await db.batch([
      db.update(ad).set({ paused: to === "pause", updatedAt: new Date() }).where(eq(ad.id, id)),
      log(to === "pause" ? "ad.pause" : "ad.resume"),
    ]);
    publicContentChanged();
    redirect(`/newsroom/ads/${id}?done=${to === "pause" ? "paused" : "resumed"}`);
  }
  if (to === "delete") {
    await db.batch([db.delete(ad).where(eq(ad.id, id)), log("ad.delete")]);
    publicContentChanged();
    redirect("/newsroom/ads?done=deleted");
  }
  return { error: "Unknown action." };
}
