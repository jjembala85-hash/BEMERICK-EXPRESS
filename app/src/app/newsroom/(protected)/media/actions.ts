"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLog, media } from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { can } from "@/lib/permissions";
import { allKeys, deleteMediaFiles } from "@/lib/media";
import { isPhotoInUse } from "@/lib/queries/media";

export type PhotoState = { error?: string; message?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Loads the photo and checks the person may change it: the uploader, or an editor or admin. */
async function photoForChange(formData: FormData) {
  const staff = await requireStaff("media.upload");
  const id = String(formData.get("mediaId") ?? "");
  if (!UUID.test(id)) return { error: "This photo could not be found." } as const;
  const [row] = await getDb()
    .select({ id: media.id, r2Key: media.r2Key, variants: media.variants, uploadedBy: media.uploadedBy, credit: media.credit })
    .from(media)
    .where(eq(media.id, id))
    .limit(1);
  if (!row) return { error: "This photo could not be found. It may have been deleted." } as const;
  if (row.uploadedBy !== staff.id && !can(staff.role, "media.manage")) {
    return { error: "Only the person who uploaded this photo, or an editor, can change it." } as const;
  }
  return { staff, row } as const;
}

export async function updatePhoto(_prev: PhotoState, formData: FormData): Promise<PhotoState> {
  const found = await photoForChange(formData);
  if ("error" in found) return { error: found.error };
  const { staff, row } = found;

  const altText = String(formData.get("altText") ?? "").trim();
  const credit = String(formData.get("credit") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  const licence = String(formData.get("licence") ?? "").trim();
  if (!altText) return { error: "Describe the photo (alt text). Readers who cannot see it rely on this." };
  if (!credit) return { error: "Add the photo credit. Every photo must be credited." };
  if (altText.length > 300 || caption.length > 300) return { error: "The description or caption is too long (300 maximum)." };
  if (credit.length > 120 || licence.length > 120) return { error: "The credit or licence is too long (120 maximum)." };

  const db = getDb();
  await db.batch([
    db
      .update(media)
      .set({ altText, credit, caption: caption || null, licence: licence || null, updatedAt: new Date() })
      .where(eq(media.id, row.id)),
    db.insert(auditLog).values({
      actorId: staff.id,
      action: "media.update",
      entity: "media",
      entityId: row.id,
      details: credit === row.credit ? {} : { creditBefore: row.credit, creditAfter: credit },
    }),
  ]);
  refresh();
  return { message: "Photo details saved. Stories using this photo show the new details." };
}

export async function deletePhoto(_prev: PhotoState, formData: FormData): Promise<PhotoState> {
  const found = await photoForChange(formData);
  if ("error" in found) return { error: found.error };
  const { staff, row } = found;

  if (await isPhotoInUse(row.id)) {
    return { error: "This photo is used by a story or a kept past version, so it cannot be deleted." };
  }

  const db = getDb();
  try {
    await db.batch([
      db.delete(media).where(eq(media.id, row.id)),
      db.insert(auditLog).values({
        actorId: staff.id,
        action: "media.delete",
        entity: "media",
        entityId: row.id,
        details: { credit: row.credit },
      }),
    ]);
  } catch (error) {
    // Most likely a story picked the photo a moment ago (the database refuses the delete).
    console.error("Photo delete refused", error);
    return { error: "This photo could not be deleted. It may have just been added to a story." };
  }
  // The record is gone; clearing the files is best effort (a leftover file costs almost nothing).
  await deleteMediaFiles(allKeys(row)).catch((error) => console.error("Could not remove photo files", error));
  redirect("/newsroom/media?deleted=1");
}
