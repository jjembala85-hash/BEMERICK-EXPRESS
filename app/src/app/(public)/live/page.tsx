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

function OnAir({ stream, lead }: { stream: LiveStreamView; lead: boolean }) {
  const Heading = lead ? "h1" : "h2";
  return (
    <article id={`live-${stream.id}`} className={lead ? "" : "scroll-mt-20 border-t border-mist pt-8"}>
      <JsonLd data={liveBroadcast({ title: stream.title, summary: stream.summary, started: stream.startedAt, videoId: stream.youtubeVideoId })} />
      <p className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#c8401f]">
        <span className="size-2 animate-pulse rounded-full bg-[#c8401f] motion-reduce:animate-none" aria-hidden />
        Live now
        {stream.sectionSlug && (
          <Link href={`/${stream.sectionSlug}`} className="text-lake-ink hover:underline">· {stream.sectionName}</Link>
        )}
      </p>
      <Heading className={`mt-1 font-serif font-bold leading-tight text-ink ${lead ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"}`}>{stream.title}</Heading>
      {stream.startedAt && <p className="mt-1 text-sm text-slate">Started {formatEAT(stream.startedAt)}</p>}
      <div className="mt-5">
        <YouTubePlayer videoId={stream.youtubeVideoId} title={stream.title} live />
      </div>
      {stream.summary && <p className="mt-5 font-serif text-lg leading-relaxed text-ink">{stream.summary}</p>}
      {stream.keyPoints.length > 0 && (
        <section aria-label="Key points" className="mt-6 rounded-lg border-l-4 border-crane-gold bg-surface p-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">Key points</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink">
            {stream.keyPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </section>
      )}
      <Related stream={stream} />
    </article>
  );
}

function ComingUp({ streams }: { streams: LiveStreamView[] }) {
  if (streams.length === 0) return null;
  return (
    <section aria-labelledby="coming-up" className="mt-6 rounded-lg bg-surface p-4">
      <h2 id="coming-up" className="text-sm font-semibold uppercase tracking-[0.08em] text-lake-ink">{streams.length === 1 ? "Next live" : "Coming up"}</h2>
      <ul className="mt-2 space-y-3">
        {streams.map((s) => (
          <li key={s.id}>
            <p className="font-serif text-xl font-bold text-ink">{s.title}</p>
            <p className="text-ink">
              {s.scheduledStart ? formatEAT(s.scheduledStart) : ""}
              {s.sectionName && <span className="text-slate"> · {s.sectionName}</span>}
            </p>
            {s.summary && <p className="mt-1 text-slate">{s.summary}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

async function Live() {
  const [{ onAir, upcoming }, bulletins] = await Promise.all([getLiveState(), getLatestStories({ type: "bulletin", limit: 6 })]);

  return (
    <>
      {onAir.length > 1 && (
        <nav aria-label="Streams on air" className="mb-8 rounded-lg border-2 border-[#c8401f] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#c8401f]">{onAir.length} streams live now</p>
          <ul className="mt-2 space-y-1">
            {onAir.map((s) => (
              <li key={s.id}>
                <a href={`#live-${s.id}`} className="font-semibold text-ink hover:underline">
                  {s.title}
                  {s.sectionName && <span className="font-normal text-slate"> · {s.sectionName}</span>}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {onAir.length > 0 ? (
        <div className="space-y-10">
          {onAir.map((s, i) => (
            <OnAir key={s.id} stream={s} lead={i === 0} />
          ))}
          <ComingUp streams={upcoming} />
        </div>
      ) : (
        <header className="border-b-2 border-crane-gold pb-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate">
            <span className="inline-block h-3.5 w-1 bg-crane-gold" aria-hidden />
            BX Live
          </p>
          <h1 className="mt-1 font-serif text-4xl font-bold text-ink">Nothing live right now</h1>
          {upcoming.length > 0 ? (
            <ComingUp streams={upcoming} />
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
