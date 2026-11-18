"use server";

import { refresh } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLog, media, staffProfile } from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { publicContentChanged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import { parseXHandle } from "@/lib/profile";

export type ProfileState = { error?: string; message?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Saves a byline profile: your own, or anyone's if you manage staff. */
export async function saveProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const staff = await requireStaff();
  const userId = String(formData.get("userId") ?? "");
  if (userId !== staff.id && !can(staff.role, "staff.manage")) {
    return { error: "You can only change your own profile." };
  }

  const displayName = String(formData.get("displayName") ?? "").trim().replace(/\s+/g, " ");
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim().replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  const xInput = String(formData.get("xHandle") ?? "");
  const photoInput = String(formData.get("photoMediaId") ?? "");
  const isPublic = formData.get("isPublic") === "on";

  if (displayName.length < 2 || displayName.length > 80) return { error: "Enter the name readers should see (2 to 80 characters)." };
  if (jobTitle.length > 80) return { error: "The job title is too long (80 maximum)." };
  if (bio.length > 1000) return { error: "The bio is too long (1,000 characters maximum)." };
  const xHandle = parseXHandle(xInput);
  if (xHandle === false) return { error: "The X handle should look like @name (letters, numbers and _ only, up to 15)." };
  if (isPublic && bio.length < 20) return { error: "Write a short bio (at least a sentence) before turning on the public author page." };

  const db = getDb();
  let photoMediaId: string | null = null;
  if (photoInput) {
    const [photo] = UUID.test(photoInput)
      ? await db.select({ id: media.id }).from(media).where(eq(media.id, photoInput)).limit(1)
      : [];
    if (!photo) return { error: "The chosen photo no longer exists. Choose another." };
    photoMediaId = photo.id;
  }

  const [before] = await db
    .select({ isPublic: staffProfile.isPublic })
    .from(staffProfile)
    .where(eq(staffProfile.userId, userId))
    .limit(1);
  if (!before) return { error: "This person has no byline profile." };

  await db.batch([
    db
      .update(staffProfile)
      .set({ displayName, jobTitle: jobTitle || null, bio: bio || null, xHandle, photoMediaId, isPublic, updatedAt: new Date() })
      .where(eq(staffProfile.userId, userId)),
    db.insert(auditLog).values({
      actorId: staff.id,
      action: "profile.update",
      entity: "user",
      entityId: userId,
      details: before.isPublic === isPublic ? {} : { authorPage: isPublic ? "on" : "off" },
    }),
  ]);
  publicContentChanged();
  refresh();
  return {
    message: isPublic
      ? "Profile saved. The author page is public and bylines link to it."
      : "Profile saved. The author page is hidden; bylines show the name only.",
  };
}
