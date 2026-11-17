"use client";

import { useState } from "react";
import { embedUrl, watchUrl } from "@/lib/youtube";

/**
 * Click-to-load YouTube player (D-003). Until the reader taps, nothing is
 * requested from YouTube: no data used, no Google cookies or tracking.
 */
export function YouTubePlayer({
  videoId,
  title,
  poster,
  live = false,
}: {
  videoId: string;
  title: string;
  /** Our own photo for the poster; the BX card is shown when there is none. */
  poster?: { src: string; srcSet?: string; alt: string } | null;
  live?: boolean;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
        <iframe
          src={embedUrl(videoId)}
          title={title}
          className="size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="group relative block aspect-video w-full overflow-hidden rounded-md bg-brand text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-crane-gold"
        aria-label={`Play video: ${title}`}
      >
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster.src} srcSet={poster.srcSet} sizes="(min-width: 44rem) 42rem, 100vw" alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bx-mark-reverse.svg" alt="" className="size-24 opacity-25" />
          </span>
        )}
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-[#c8401f] text-white shadow-lg transition group-hover:scale-105 sm:size-20">
            <svg viewBox="0 0 24 24" className="ml-1 size-8 sm:size-10" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
        <span className="absolute bottom-3 left-3 right-3 flex items-center gap-2 text-sm font-semibold text-white">
          {live && <span className="rounded bg-[#c8401f] px-1.5 py-0.5 text-xs font-bold tracking-wider">● LIVE</span>}
          <span>Tap to watch</span>
        </span>
      </button>
      <p className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate">
        <span>Video plays from YouTube when you tap. It uses mobile data.</span>
        <a href={watchUrl(videoId)} target="_blank" rel="noopener noreferrer" className="font-semibold text-lake-ink hover:underline">
          Watch on YouTube ↗
        </a>
      </p>
    </div>
  );
}
