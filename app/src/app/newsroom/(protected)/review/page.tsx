import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { article, articleTranslation, section, user } from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { formatEAT } from "@/lib/dates";

export const metadata: Metadata = { title: "Review queue" };

/** Stories waiting for an editor, oldest first so nothing is left behind. */
export default async function ReviewQueuePage() {
  await requireStaff("article.review");
  const db = getDb();

  const base = () =>
    db
      .select({
        id: article.id,
        updatedAt: article.updatedAt,
        scheduledAt: article.scheduledAt,
        headline: articleTranslation.headline,
        standfirst: articleTranslation.standfirst,
        sectionName: section.name,
        author: user.name,
      })
      .from(article)
      .innerJoin(articleTranslation, and(eq(articleTranslation.articleId, article.id), eq(articleTranslation.lang, "en")))
      .innerJoin(section, eq(section.id, article.primarySectionId))
      .innerJoin(user, eq(user.id, article.createdBy));

  const [waiting, approved, scheduled] = await Promise.all([
    base().where(eq(article.status, "in_review")).orderBy(asc(article.updatedAt)).limit(100),
    base().where(eq(article.status, "approved")).orderBy(asc(article.updatedAt)).limit(100),
    base().where(eq(article.status, "scheduled")).orderBy(asc(article.scheduledAt)).limit(100),
  ]);

  return (
    <>
      <h1 className="font-serif text-3xl font-bold text-ink">Review queue</h1>
      <p className="mt-1 text-slate">Stories waiting for an editor, oldest first.</p>

      <Group title="Waiting for review" empty="Nothing waiting. All caught up.">
        {waiting.map((s) => (
          <Row key={s.id} story={s} meta={`Submitted by ${s.author} · ${formatEAT(s.updatedAt)}`} />
        ))}
      </Group>

      <Group title="Approved, not yet published" empty="No approved stories waiting.">
        {approved.map((s) => (
          <Row key={s.id} story={s} meta={`${s.author} · approved ${formatEAT(s.updatedAt)}`} />
        ))}
      </Group>

      <Group title="Scheduled" empty="Nothing scheduled.">
        {scheduled.map((s) => (
          <Row
            key={s.id}
            story={s}
            meta={`${s.author} · goes live ${s.scheduledAt ? formatEAT(s.scheduledAt) : "soon"}`}
          />
        ))}
      </Group>
    </>
  );
}

function Group({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="mt-8">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">
        {title} <span className="text-ink">({children.length})</span>
      </h2>
      {children.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-mist p-5 text-sm text-slate">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-mist rounded-lg border border-mist bg-surface">{children}</ul>
      )}
    </section>
  );
}

function Row({
  story,
  meta,
}: {
  story: { id: string; headline: string; standfirst: string | null; sectionName: string };
  meta: string;
}) {
  return (
    <li className="px-4 py-3">
      <Link href={`/newsroom/stories/${story.id}`} className="font-serif text-lg font-semibold text-ink hover:underline">
        {story.headline}
      </Link>
      {story.standfirst && <p className="mt-0.5 text-sm text-slate">{story.standfirst}</p>}
      <p className="mt-1 text-xs text-slate">
        <span className="font-semibold text-ink">{story.sectionName}</span> · {meta}
      </p>
    </li>
  );
}
