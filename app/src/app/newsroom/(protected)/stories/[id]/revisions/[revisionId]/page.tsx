import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { article, articleRevision, user } from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { can } from "@/lib/permissions";
import { RichText } from "@/lib/rich-text";
import { formatEAT } from "@/lib/dates";

export const metadata: Metadata = { title: "Past version" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const reasonLabels: Record<string, string> = {
  publish: "Published",
  update: "Edited while live",
  correction: "Correction added",
};

/** A read-only copy of the story as readers saw it at that moment. */
export default async function RevisionPage({ params }: PageProps<"/newsroom/stories/[id]/revisions/[revisionId]">) {
  const staff = await requireStaff("article.create");
  const { id, revisionId } = await params;
  if (!UUID.test(id) || !UUID.test(revisionId)) notFound();

  const [rev] = await getDb()
    .select({
      headline: articleRevision.headline,
      standfirst: articleRevision.standfirst,
      body: articleRevision.body,
      reason: articleRevision.reason,
      createdAt: articleRevision.createdAt,
      author: user.name,
      storyOwner: article.createdBy,
    })
    .from(articleRevision)
    .innerJoin(article, eq(article.id, articleRevision.articleId))
    .leftJoin(user, eq(user.id, articleRevision.createdBy))
    .where(and(eq(articleRevision.id, revisionId), eq(articleRevision.articleId, id)))
    .limit(1);
  if (!rev) notFound();
  if (rev.storyOwner !== staff.id && !can(staff.role, "article.edit_any")) notFound();

  return (
    <>
      <Link href={`/newsroom/stories/${id}`} className="text-sm font-semibold text-lake-ink hover:underline">← Back to the story</Link>
      <p className="mt-4 rounded-md border-l-4 border-crane-gold bg-surface px-4 py-3 text-sm text-ink">
        <span className="font-semibold">{reasonLabels[rev.reason] ?? rev.reason}</span> · {formatEAT(rev.createdAt)}
        {rev.author ? ` · ${rev.author}` : ""}. This is a saved copy and cannot be edited.
      </p>
      <article className="mx-auto mt-6 max-w-[44rem]">
        <h1 className="font-serif text-[2rem] font-bold leading-tight text-ink">{rev.headline}</h1>
        {rev.standfirst && <p className="mt-3 font-serif text-xl italic text-slate">{rev.standfirst}</p>}
        <div className="mt-6 font-serif text-[1.15rem] leading-[1.7] text-ink">
          <RichText doc={rev.body} />
        </div>
      </article>
    </>
  );
}
