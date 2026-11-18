import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getLatestStories, getLiveState, type LiveStreamView } from "@/lib/queries/public";
import { formatEAT } from "@/lib/dates";
import { YouTubePlayer } from "@/components/youtube-player";
import { BulletinGrid } from "@/components/bulletin-grid";
import { JsonLd } from "@/components/json-ld";
import { liveBroadcast } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Live",
  description: "Watch BX News live: big events, press conferences and bulletins from Uganda.",
  alternates: { canonical: "/live" },
};

export default function LivePage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
      <Suspense fallback={<p className="text-slate">Loading…</p>}>
        <Live />
      </Suspense>
    </div>
  );
}

function Related({ stream }: { stream: LiveStreamView }) {
  if (!stream.relatedSlug || !stream.relatedSection) return null;
  return (
    <p className="mt-6 border-t border-mist pt-4">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">Read the story</span>
      <Link href={`/${stream.relatedSection}/${stream.relatedSlug}`} className="mt-1 block font-serif text-xl font-bold text-ink hover:underline">
        {stream.relatedHeadline}
      </Link>
    </p>
  );
}

async function Live() {
  const [{ onAir, next }, bulletins] = await Promise.all([getLiveState(), getLatestStories({ type: "bulletin", limit: 6 })]);

  return (
    <>
      {onAir ? (
        <article>
          <JsonLd data={liveBroadcast({ title: onAir.title, summary: onAir.summary, started: onAir.startedAt, videoId: onAir.youtubeVideoId })} />
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#c8401f]">
            <span className="size-2 animate-pulse rounded-full bg-[#c8401f] motion-reduce:animate-none" aria-hidden />
            Live now
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold leading-tight text-ink sm:text-4xl">{onAir.title}</h1>
          {onAir.startedAt && <p className="mt-1 text-sm text-slate">Started {formatEAT(onAir.startedAt)}</p>}
          <div className="mt-5">
            <YouTubePlayer videoId={onAir.youtubeVideoId} title={onAir.title} live />
          </div>
          {onAir.summary && <p className="mt-5 font-serif text-lg leading-relaxed text-ink">{onAir.summary}</p>}
          {onAir.keyPoints.length > 0 && (
            <section aria-labelledby="key-points" className="mt-6 rounded-lg border-l-4 border-crane-gold bg-surface p-4">
              <h2 id="key-points" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">Key points</h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink">
                {onAir.keyPoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </section>
          )}
          <Related stream={onAir} />
        </article>
      ) : (
        <header className="border-b-2 border-crane-gold pb-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate">
            <span className="inline-block h-3.5 w-1 bg-crane-gold" aria-hidden />
            BX Live
          </p>
          <h1 className="mt-1 font-serif text-4xl font-bold text-ink">Nothing live right now</h1>
          {next?.scheduledStart ? (
            <div className="mt-4 rounded-lg bg-surface p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-lake-ink">Next live</p>
              <p className="mt-1 font-serif text-2xl font-bold text-ink">{next.title}</p>
              <p className="mt-1 text-ink">{formatEAT(next.scheduledStart)}</p>
              {next.summary && <p className="mt-2 text-slate">{next.summary}</p>}
            </div>
          ) : (
            <p className="mt-3 text-lg text-slate">
              Big events, press conferences and bulletins are streamed here. Follow our WhatsApp Channel to hear when we go live.
            </p>
          )}
        </header>
      )}

      <section aria-labelledby="bulletins-heading" className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 id="bulletins-heading" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">Latest bulletins</h2>
          <Link href="/bulletins" className="text-sm font-semibold text-lake-ink hover:underline">All bulletins →</Link>
        </div>
        {bulletins.length > 0 ? (
          <BulletinGrid stories={bulletins} />
        ) : (
          <p className="mt-4 text-slate">Video bulletins will appear here.</p>
        )}
      </section>
    </>
  );
}
