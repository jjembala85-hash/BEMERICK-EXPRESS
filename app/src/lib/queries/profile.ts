// Loads a byline profile for the newsroom profile editor.
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { media, staffProfile, user } from "@/db/schema";
import { mediaUrl, smallestKey } from "@/lib/media";
import type { ProfileValues } from "@/components/newsroom/profile-form";

export async function getProfileForEditing(userId: string): Promise<(ProfileValues & { email: string }) | null> {
  const [row] = await getDb()
    .select({
      userId: staffProfile.userId,
      displayName: staffProfile.displayName,
      slug: staffProfile.slug,
      jobTitle: staffProfile.jobTitle,
      bio: staffProfile.bio,
      xHandle: staffProfile.xHandle,
      isPublic: staffProfile.isPublic,
      email: user.email,
      photoId: media.id,
      r2Key: media.r2Key,
      variants: media.variants,
      altText: media.altText,
      credit: media.credit,
      caption: media.caption,
    })
    .from(staffProfile)
    .innerJoin(user, eq(user.id, staffProfile.userId))
    .leftJoin(media, eq(media.id, staffProfile.photoMediaId))
    .where(eq(staffProfile.userId, userId))
    .limit(1);
  if (!row) return null;
  return {
    userId: row.userId,
    displayName: row.displayName,
    slug: row.slug,
    jobTitle: row.jobTitle ?? "",
    bio: row.bio ?? "",
    xHandle: row.xHandle ?? "",
    isPublic: row.isPublic,
    email: row.email,
    photo:
      row.photoId && row.r2Key
        ? {
            id: row.photoId,
            previewUrl: mediaUrl(smallestKey({ r2Key: row.r2Key, variants: row.variants })),
            altText: row.altText ?? "",
            credit: row.credit ?? "",
            caption: row.caption,
          }
        : null,
  };
}
