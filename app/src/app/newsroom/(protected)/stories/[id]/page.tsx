import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { article, articleTranslation, media, section } from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { can } from "@/lib/permissions";
import { isStorageReady, mediaUrl } from "@/lib/media";
import { StoryForm } from "@/components/newsroom/story-form";

export const metadata: Metadata = { title: "Edit story" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const flashMessages: Record<string, string> = {
  created: "Draft saved.",
  published: "Published. The story is live.",
};

export default async function EditStoryPage({
  params,
  searchParams,
}: PageProps<"/newsroom/stories/[id]">) {
  const staff = await requireStaff("article.create");
  const { id } = await params;
  const saved = (await searchParams).saved;
  if (!UUID.test(id)) notFound();

  const db = getDb();
  const [story] = await db
    .select({
      id: article.id,
      status: article.status,
      type: article.type,
      sectionId: article.primarySectionId,
      createdBy: article.createdBy,
      firstPublishedAt: article.firstPublishedAt,
      headline: articleTranslation.headline,
      standfirst: articleTranslation.standfirst,
      slug: articleTranslation.slug,
      body: articleTranslation.body,
      sectionSlug: section.slug,
      photo: {
        id: media.id,
        r2Key: media.r2Key,
        variants: media.variants,
        altText: media.altText,
        credit: media.credit,
        caption: media.caption,
      },
    })
    .from(article)
    .innerJoin(articleTranslation, and(eq(articleTranslation.articleId, article.id), eq(articleTranslation.lang, "en")))
    .innerJoin(section, eq(section.id, article.primarySectionId))
    .leftJoin(media, eq(media.id, article.leadMediaId))
    .where(eq(article.id, id))
    .limit(1);

  if (!story) notFound();
  if (story.createdBy !== staff.id && !can(staff.role, "article.edit_any")) notFound();

  // The smallest stored size is enough for the editor preview.
  const smallestKey = story.photo
    ? (Object.entries((story.photo.variants ?? {}) as Record<string, string>).sort(
        (a, b) => Number(a[0]) - Number(b[0]),
      )[0]?.[1] ?? story.photo.r2Key)
    : null;

  const sections = await db
    .select({ id: section.id, name: section.name })
    .from(section)
    .where(eq(section.isActive, true))
    .orderBy(section.sortOrder);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/newsroom/stories" className="text-sm font-semibold text-lake-ink hover:underline">← Stories</Link>
        {story.status === "published" && (
          <Link href={`/${story.sectionSlug}/${story.slug}`} className="text-sm font-semibold text-lake-ink hover:underline">
            View live story →
          </Link>
        )}
      </div>
      <h1 className="mb-6 mt-2 font-serif text-3xl font-bold text-ink">Edit story</h1>
      <StoryForm
        key={`${story.id}-${story.status}`}
        values={{
          id: story.id,
          status: story.status,
          headline: story.headline,
          standfirst: story.standfirst ?? "",
          sectionId: story.sectionId,
          type: story.type,
          slug: story.slug,
          body: story.body,
          slugLocked: Boolean(story.firstPublishedAt),
          leadPhoto:
            story.photo && smallestKey
              ? {
                  id: story.photo.id,
                  previewUrl: mediaUrl(smallestKey),
                  altText: story.photo.altText,
                  credit: story.photo.credit,
                  caption: story.photo.caption,
                }
              : null,
        }}
        sections={sections}
        canPublish={can(staff.role, "article.publish")}
        canUnpublish={can(staff.role, "article.unpublish")}
        storageReady={isStorageReady()}
        flash={typeof saved === "string" ? flashMessages[saved] : undefined}
      />
    </>
  );
}
