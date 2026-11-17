// Photo library queries (newsroom only).
import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { article, articleRevision, media, user } from "@/db/schema";
import { mediaUrl, smallestKey } from "@/lib/media";

export const LIBRARY_PAGE_SIZE = 24;

/** Escapes LIKE wildcards so a search for "50%" means the text "50%". */
export function likePattern(text: string) {
  return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}

/** Stories (current version) that use the photo as their lead. */
const storyCount = sql<number>`(select count(*)::int from ${article} where ${article.leadMediaId} = ${media.id})`;

export type LibraryPhoto = {
  id: string;
  previewUrl: string;
  altText: string;
  credit: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  uploadedBy: string;
  uploaderName: string;
  createdAt: Date;
  stories: number;
};

/** Newest photos first, optionally filtered by words in the description, credit or caption. */
export async function searchPhotos({ q = "", page = 1 }: { q?: string; page?: number }) {
  const text = q.trim().slice(0, 100);
  const where = text
    ? or(ilike(media.altText, likePattern(text)), ilike(media.credit, likePattern(text)), ilike(media.caption, likePattern(text)))
    : undefined;
  const rows = await getDb()
    .select({
      id: media.id,
      r2Key: media.r2Key,
      variants: media.variants,
      altText: media.altText,
      credit: media.credit,
      caption: media.caption,
      width: media.width,
      height: media.height,
      uploadedBy: media.uploadedBy,
      uploaderName: user.name,
      createdAt: media.createdAt,
      stories: storyCount,
    })
    .from(media)
    .innerJoin(user, eq(user.id, media.uploadedBy))
    .where(where)
    .orderBy(desc(media.createdAt), desc(media.id))
    // One extra row tells us whether there is a next page.
    .limit(LIBRARY_PAGE_SIZE + 1)
    .offset((Math.max(1, page) - 1) * LIBRARY_PAGE_SIZE);

  const photos: LibraryPhoto[] = rows.slice(0, LIBRARY_PAGE_SIZE).map(({ r2Key, variants, ...row }) => ({
    ...row,
    previewUrl: mediaUrl(smallestKey({ r2Key, variants })),
  }));
  return { photos, hasMore: rows.length > LIBRARY_PAGE_SIZE };
}

/** True when any story or kept past version shows the photo, so it must not be deleted. */
export async function isPhotoInUse(id: string) {
  const db = getDb();
  const [[current], [past]] = await Promise.all([
    db.select({ id: article.id }).from(article).where(eq(article.leadMediaId, id)).limit(1),
    db.select({ id: articleRevision.id }).from(articleRevision).where(eq(articleRevision.leadMediaId, id)).limit(1),
  ]);
  return Boolean(current || past);
}
