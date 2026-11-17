import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { article, articleTranslation, media, user } from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { can } from "@/lib/permissions";
import { toPhoto } from "@/lib/media";
import { formatEAT } from "@/lib/dates";
import { isPhotoInUse, photoProfiles } from "@/lib/queries/media";
import { isStatus, statusLabels } from "@/lib/workflow";
import { DeletePhotoButton, PhotoDetailsForm } from "@/components/newsroom/photo-library";

export const metadata: Metadata = { title: "Photo" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PhotoPage({ params }: PageProps<"/newsroom/media/[id]">) {
  const staff = await requireStaff("media.upload");
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const db = getDb();
  const [row] = await db
    .select({
      id: media.id,
      r2Key: media.r2Key,
      variants: media.variants,
      width: media.width,
      height: media.height,
      bytes: media.bytes,
      altText: media.altText,
      credit: media.credit,
      caption: media.caption,
      licence: media.licence,
      uploadedBy: media.uploadedBy,
      uploaderName: user.name,
      createdAt: media.createdAt,
    })
    .from(media)
    .innerJoin(user, eq(user.id, media.uploadedBy))
    .where(eq(media.id, id))
    .limit(1);
  if (!row) notFound();

  const [stories, inUse, profiles] = await Promise.all([
    db
      .select({ id: article.id, status: article.status, headline: articleTranslation.headline })
      .from(article)
      .innerJoin(articleTranslation, and(eq(articleTranslation.articleId, article.id), eq(articleTranslation.lang, "en")))
      .where(eq(article.leadMediaId, row.id))
      .orderBy(desc(article.updatedAt))
      .limit(50),
    isPhotoInUse(row.id),
    photoProfiles(row.id),
  ]);

  const photo = toPhoto(row);
  const mayChange = row.uploadedBy === staff.id || can(staff.role, "media.manage");

  return (
    <>
      <Link href="/newsroom/media" className="text-sm font-semibold text-lake-ink hover:underline">← Photos</Link>
      <h1 className="mb-6 mt-2 font-serif text-3xl font-bold text-ink">Photo</h1>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div>
          {photo && (
            // Whole photo, not cropped, so editors can judge it before reusing it.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.src}
              srcSet={photo.srcSet || undefined}
              sizes="(min-width: 1024px) 720px, 100vw"
              alt={photo.alt}
              width={photo.width ?? undefined}
              height={photo.height ?? undefined}
              className="mx-auto max-h-[70vh] w-auto max-w-full rounded-lg bg-mist object-contain"
            />
          )}
          <p className="mt-2 text-xs text-slate">Stories show it in a wide (16:9) frame, cropped from the middle.</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate">Uploaded</dt>
            <dd className="text-ink">{formatEAT(row.createdAt)} by {row.uploaderName}</dd>
            {row.width && row.height && (
              <>
                <dt className="text-slate">Size</dt>
                <dd className="text-ink">
                  {row.width} × {row.height} pixels{row.bytes ? ` · ${Math.round(row.bytes / 1024)} KB` : ""}
                </dd>
              </>
            )}
          </dl>

          <h2 className="mt-8 font-serif text-xl font-bold text-ink">Used in</h2>
          {stories.length === 0 ? (
            <p className="mt-2 text-sm text-slate">No story uses this photo as its lead.</p>
          ) : (
            <ul className="mt-2 divide-y divide-mist rounded-lg border border-mist bg-surface">
              {stories.map((s) => (
                <li key={s.id} className="flex flex-wrap items-baseline gap-x-3 px-3 py-2 text-sm">
                  <Link href={`/newsroom/stories/${s.id}`} className="font-semibold text-ink hover:underline">{s.headline}</Link>
                  <span className="text-slate">{isStatus(s.status) ? statusLabels[s.status] : s.status}</span>
                </li>
              ))}
            </ul>
          )}
          {profiles.length > 0 && (
            <p className="mt-3 text-sm text-ink">
              Profile photo of {profiles.map((p) => p.name).join(", ")}.
            </p>
          )}
        </div>

        <aside>
          <PhotoDetailsForm
            mediaId={row.id}
            editable={mayChange}
            initial={{ altText: row.altText, credit: row.credit, caption: row.caption ?? "", licence: row.licence ?? "" }}
          />
          {mayChange && (
            <div className="mt-8 border-t border-mist pt-4">
              {inUse ? (
                <p className="text-sm text-slate">
                  This photo cannot be deleted because a story, a kept past version of one, or a staff profile uses it.
                </p>
              ) : (
                <DeletePhotoButton mediaId={row.id} />
              )}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
