import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { article, articleTranslation } from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { can } from "@/lib/permissions";
import { formatEAT } from "@/lib/dates";
import type { Status } from "@/lib/workflow";

const tiles: { status: Status; label: string; href?: string }[] = [
  { status: "draft", label: "Drafts" },
  { status: "in_review", label: "In review", href: "/newsroom/review" },
  { status: "scheduled", label: "Scheduled", href: "/newsroom/review" },
  { status: "published", label: "Published" },
];

export default async function NewsroomDashboard() {
  const staff = await requireStaff();
  const reviewer = can(staff.role, "article.review");
  const db = getDb();

  // Editors see the whole newsroom; writers see their own stories.
  const mine = (status: Status) =>
    reviewer ? eq(article.status, status) : and(eq(article.status, status), eq(article.createdBy, staff.id));

  const [counts, sentBack] = await Promise.all([
    Promise.all(
      tiles.map(async (t) => {
        const [row] = await db.select({ n: count() }).from(article).where(mine(t.status));
        return { ...t, n: row?.n ?? 0 };
      }),
    ),
    db
      .select({ id: article.id, headline: articleTranslation.headline, updatedAt: article.updatedAt })
      .from(article)
      .innerJoin(articleTranslation, and(eq(articleTranslation.articleId, article.id), eq(articleTranslation.lang, "en")))
      .where(and(eq(article.status, "changes_requested"), eq(article.createdBy, staff.id)))
      .orderBy(desc(article.updatedAt))
      .limit(20),
  ]);
  const waiting = counts.find((c) => c.status === "in_review")?.n ?? 0;

  return (
    <>
      <h1 className="font-serif text-3xl font-bold text-ink">Welcome, {staff.name.split(" ")[0]}</h1>
      <p className="mt-1 text-slate">
        {reviewer ? "Here is where the newsroom stands." : "Here is where your stories stand."}
      </p>

      {(sentBack.length > 0 || (reviewer && waiting > 0)) && (
        <section className="mt-6 rounded-lg border-l-4 border-crane-gold bg-surface p-5">
          <h2 className="font-semibold text-ink">Needs your attention</h2>
          <ul className="mt-2 space-y-1.5">
            {reviewer && waiting > 0 && (
              <li>
                <Link href="/newsroom/review" className="font-semibold text-lake-ink hover:underline">
                  {waiting} {waiting === 1 ? "story is" : "stories are"} waiting for review →
                </Link>
              </li>
            )}
            {sentBack.map((s) => (
              <li key={s.id}>
                <Link href={`/newsroom/stories/${s.id}`} className="text-ink hover:underline">
                  <span className="font-semibold text-ember">Sent back:</span> {s.headline}
                </Link>
                <span className="ml-2 text-xs text-slate">{formatEAT(s.updatedAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {counts.map((t) => {
          const tile = (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">{t.label}</p>
              <p className="mt-2 font-serif text-4xl font-bold text-ink">{t.n}</p>
            </>
          );
          return t.href && reviewer ? (
            <Link key={t.status} href={t.href} className="rounded-lg border border-mist bg-surface p-5 hover:border-lake-ink">
              {tile}
            </Link>
          ) : (
            <div key={t.status} className="rounded-lg border border-mist bg-surface p-5">{tile}</div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/newsroom/stories/new" className="rounded-md bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-deep">
          New story
        </Link>
        <Link href="/newsroom/stories" className="rounded-md border border-lake-ink px-4 py-2.5 font-semibold text-lake-ink hover:bg-mist">
          All stories
        </Link>
        {reviewer && (
          <Link href="/newsroom/review" className="rounded-md border border-lake-ink px-4 py-2.5 font-semibold text-lake-ink hover:bg-mist">
            Review queue
          </Link>
        )}
      </div>
    </>
  );
}
