import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { article, articleTranslation, section, user } from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { can } from "@/lib/permissions";
import { formatEAT } from "@/lib/dates";
import { isStatus, statusLabels } from "@/lib/workflow";

export const metadata: Metadata = { title: "Stories" };

const statusStyle: Record<string, string> = {
  published: "bg-lake-ink/15 text-lake-ink",
  scheduled: "bg-lake-ink/15 text-lake-ink",
  approved: "bg-lake-ink/10 text-lake-ink",
  in_review: "bg-crane-gold/20 text-ink",
  changes_requested: "bg-ember/10 text-ember",
  draft: "bg-mist text-ink",
  unpublished: "bg-ember/10 text-ember",
  spiked: "bg-ember/10 text-ember",
};

export default async function StoriesPage() {
  const staff = await requireStaff("article.create");
  const seeAll = can(staff.role, "article.edit_any");

  const rows = await getDb()
    .select({
      id: article.id,
      status: article.status,
      updatedAt: article.updatedAt,
      headline: articleTranslation.headline,
      slug: articleTranslation.slug,
      sectionName: section.name,
      sectionSlug: section.slug,
      author: user.name,
    })
    .from(article)
    .innerJoin(articleTranslation, eq(articleTranslation.articleId, article.id))
    .innerJoin(section, eq(section.id, article.primarySectionId))
    .innerJoin(user, eq(user.id, article.createdBy))
    .where(
      seeAll
        ? eq(articleTranslation.lang, "en")
        : and(eq(articleTranslation.lang, "en"), eq(article.createdBy, staff.id)),
    )
    .orderBy(desc(article.updatedAt))
    .limit(100);

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-3xl font-bold text-ink">Stories</h1>
        <Link href="/newsroom/stories/new" className="rounded-md bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-deep">
          New story
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-mist p-8 text-center text-slate">
          No stories yet. Write the first one.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-mist rounded-lg border border-mist bg-surface">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
              <Link href={`/newsroom/stories/${r.id}`} className="min-w-0 flex-1 basis-64 font-serif text-lg font-semibold text-ink hover:underline">
                {r.headline}
              </Link>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${statusStyle[r.status] ?? "bg-mist text-ink"}`}>
                {isStatus(r.status) ? statusLabels[r.status] : r.status}
              </span>
              <span className="text-sm text-slate">{r.sectionName}</span>
              <span className="text-sm text-slate">{r.author}</span>
              <span className="text-sm text-slate">{formatEAT(r.updatedAt)}</span>
              {r.status === "published" && (
                <Link href={`/${r.sectionSlug}/${r.slug}`} className="text-sm font-semibold text-lake-ink hover:underline">
                  View
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
