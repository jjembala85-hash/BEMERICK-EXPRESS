"use client";

import { useState, useSyncExternalStore } from "react";
import { WHATSAPP_CHANNEL_URL } from "@/lib/site";

const linkClass = "rounded-md border border-mist px-3.5 py-2 text-sm font-semibold text-ink hover:bg-mist";
const noop = () => () => {};

/** Share buttons under a story: WhatsApp first (Blueprint §10), X, copy link, and the phone's own share sheet. */
export function ReaderShare({ url, headline }: { url: string; headline: string }) {
  const [copied, setCopied] = useState(false);
  // The phone's share sheet exists only in some browsers; checked after load.
  const canShare = useSyncExternalStore(noop, () => typeof navigator !== "undefined" && "share" in navigator, () => false);
  return (
    <div className="mt-10 border-t border-mist pt-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate">Share</span>
        <a className={linkClass} href={`https://wa.me/?text=${encodeURIComponent(`${headline} ${url}`)}`} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
        <a className={linkClass} href={`https://x.com/intent/post?text=${encodeURIComponent(headline)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">
          X
        </a>
        <button
          type="button"
          className={linkClass}
          onClick={async () => {
            await navigator.clipboard.writeText(url).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          }}
        >
          {copied ? "Link copied ✓" : "Copy link"}
        </button>
        {canShare && (
          <button
            type="button"
            className={linkClass}
            onClick={() => navigator.share({ title: headline, url }).catch(() => {})}
          >
            More…
          </button>
        )}
      </div>
      <a
        href={WHATSAPP_CHANNEL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 flex items-center gap-3 rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 px-4 py-3 text-ink hover:bg-[#25D366]/15"
      >
        <svg viewBox="0 0 24 24" className="size-7 shrink-0 text-[#1DA851]" fill="currentColor" aria-hidden>
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z" />
        </svg>
        <span>
          <span className="block font-semibold">Get BX News on WhatsApp</span>
          <span className="block text-sm text-slate">Follow our WhatsApp Channel for breaking news and the morning briefing.</span>
        </span>
        <span className="ml-auto text-sm font-semibold text-lake-ink">Follow →</span>
      </a>
    </div>
  );
}
