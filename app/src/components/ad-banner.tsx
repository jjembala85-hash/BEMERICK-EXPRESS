import { pickAd, type AdSlot } from "@/lib/ads";
import type { RunningAds } from "@/lib/queries/public";
import { AdView } from "./ad-view";

/**
 * One direct-sold banner for a slot, or nothing. Clearly labelled, separated
 * from the journalism, and the link is marked sponsored for search engines.
 */
export function AdBanner({ running, slot, className = "" }: { running: RunningAds; slot: AdSlot; className?: string }) {
  const ad = pickAd(running.ads, slot, running.turn);
  if (!ad) return null;
  return (
    <aside aria-label="Advertisement" className={`border-y border-mist py-3 ${className}`}>
      <p className="mb-2 text-center text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-slate">Advertisement</p>
      <AdView id={ad.id}>
        <a href={`/api/ad/${ad.id}`} target="_blank" rel="sponsored noopener" className="block" data-ad-slot={slot}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ad.photo.src}
            srcSet={ad.photo.srcSet || undefined}
            sizes="(min-width: 64rem) 62rem, 100vw"
            width={ad.photo.width ?? undefined}
            height={ad.photo.height ?? undefined}
            alt={ad.photo.alt || `Advertisement from ${ad.advertiser}`}
            loading="lazy"
            decoding="async"
            className="mx-auto h-auto w-full max-w-5xl rounded"
          />
        </a>
      </AdView>
    </aside>
  );
}
