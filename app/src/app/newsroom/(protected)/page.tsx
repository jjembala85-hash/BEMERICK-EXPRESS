import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { article } from "@/db/schema";
import { requireStaff } from "@/lib/session";

const tiles = [
  { status: "draft", label: "Drafts" },
  { status: "in_review", label: "In review" },
  { status: "scheduled", label: "Scheduled" },
  { status: "published", label: "Published" },
] as const;

export default async function NewsroomDashboard() {
  const staff = await requireStaff();
  const db = getDb();

  const counts = await Promise.all(
    tiles.map(async (t) => {
      const [row] = await db
        .select({ n: count() })
        .from(article)
        .where(eq(article.status, t.status));
      return { ...t, n: row?.n ?? 0 };
    }),
  );

  return (
    <>
      <h1 className="font-serif text-3xl font-bold text-ink">
        Welcome, {staff.name.split(" ")[0]}
      </h1>
      <p className="mt-1 text-slate">Here is where the newsroom stands.</p>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {counts.map((t) => (
          <div key={t.status} className="rounded-lg border border-mist bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">{t.label}</p>
            <p className="mt-2 font-serif text-4xl font-bold text-ink">{t.n}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/newsroom/stories/new" className="rounded-md bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-deep">
          New story
        </Link>
        <Link href="/newsroom/stories" className="rounded-md border border-lake-ink px-4 py-2.5 font-semibold text-lake-ink hover:bg-mist">
          All stories
        </Link>
      </div>

      <p className="mt-10 rounded-lg border border-dashed border-mist p-5 text-slate">
        Photo upload, the review queue and the homepage board arrive in the next build steps.
      </p>
    </>
  );
}
