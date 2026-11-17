import type { Metadata } from "next";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { article, articleTranslation, liveStream } from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { formatEAT } from "@/lib/dates";
import { toEATInput } from "@/lib/workflow";
import { watchUrl } from "@/lib/youtube";
import { NewStream, StreamCard, type StreamValues } from "@/components/newsroom/live-controls";

export const metadata: Metadata = { title: "Live" };

const doneMessages: Record<string, string> = {
  live: "You are live. The LIVE pill now shows on every page.",
  ended: "Stream ended. The LIVE pill is gone.",
  deleted: "Stream deleted.",
};

export default async function NewsroomLivePage({ searchParams }: PageProps<"/newsroom/live">) {
  await requireStaff("homepage.manage");
  const done = (await searchParams).done;
  const flash = typeof done === "string" ? doneMessages[done] : undefined;
  const db = getDb();
  const [active, ended, stories] = await Promise.all([
    db.select().from(liveStream).where(ne(liveStream.status, "ended")).orderBy(desc(liveStream.status), liveStream.scheduledStart),
    db.select().from(liveStream).where(eq(liveStream.status, "ended")).orderBy(desc(liveStream.endedAt)).limit(10),
    db
      .select({ id: article.id, headline: articleTranslation.headline })
      .from(article)
      .innerJoin(articleTranslation, and(eq(articleTranslation.articleId, article.id), eq(articleTranslation.lang, "en")))
      .where(inArray(article.status, ["published", "scheduled", "approved"]))
      .orderBy(desc(article.updatedAt))
      .limit(80),
  ]);

  const toValues = (s: typeof liveStream.$inferSelect): StreamValues => ({
    id: s.id,
    title: s.title,
    youtube: watchUrl(s.youtubeVideoId),
    summary: s.summary ?? "",
    scheduledStart: s.scheduledStart ? toEATInput(s.scheduledStart) : "",
    keyPoints: s.keyPoints.join("\n"),
    relatedArticleId: s.relatedArticleId ?? "",
    status: s.status,
    when:
      s.status === "live" && s.startedAt
        ? `on air since ${formatEAT(s.startedAt)}`
        : s.status === "ended" && s.endedAt
          ? `ended ${formatEAT(s.endedAt)}`
          : s.scheduledStart
            ? `starts ${formatEAT(s.scheduledStart)}`
            : "",
  });
  const live = active.filter((s) => s.status === "live");
  const scheduled = active.filter((s) => s.status === "scheduled");

  return (
    <>
      <h1 className="font-serif text-3xl font-bold text-ink">Live</h1>
      <p className="mt-1 max-w-3xl text-slate">
        Start the stream on the BX YouTube channel first, then add its link here. While a stream is on air, every page shows a
        LIVE pill that opens <a href="/live" target="_blank" rel="noopener" className="font-semibold text-lake-ink hover:underline">/live ↗</a>.
        One stream is on air at a time.
      </p>
      {flash && (
        <p role="status" className="mt-4 rounded-md bg-mist px-3 py-2 font-semibold text-lake-ink">{flash}</p>
      )}

      <section className="mt-6 space-y-3">
        {live.length === 0 && <p className="rounded-lg border border-dashed border-mist p-4 text-slate">Nothing is on air.</p>}
        {[...live, ...scheduled].map((s) => (
          <StreamCard key={s.id} values={toValues(s)} stories={stories} />
        ))}
      </section>

      <section className="mt-8 rounded-lg border border-mist bg-surface p-5">
        <h2 className="mb-4 font-serif text-xl font-bold text-ink">Add a stream</h2>
        <NewStream stories={stories} />
      </section>

      {ended.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">Recently ended</h2>
          <div className="mt-3 space-y-2">
            {ended.map((s) => (
              <StreamCard key={s.id} values={toValues(s)} stories={stories} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
