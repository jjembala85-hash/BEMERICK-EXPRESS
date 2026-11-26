"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { readConsent, subscribeConsent } from "@/lib/consent";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/** Adds Google's ad script to the page once. Only ever called after consent. */
function loadAdsenseScript(client: string) {
  if (document.querySelector("script[data-bx-adsense]")) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  script.crossOrigin = "anonymous";
  script.dataset.bxAdsense = "1";
  document.head.appendChild(script);
}

/**
 * A Google AdSense display unit for a place with no direct-sold banner (D-049).
 * Renders nothing, and loads nothing from Google, until the reader has accepted
 * advertising cookies. If Google has no ad to show, the box hides itself
 * (globals.css, data-ad-status="unfilled").
 */
export function AdsenseUnit({ client, unit, place, className = "" }: { client: string; unit: string; place: string; className?: string }) {
  const consent = useSyncExternalStore(subscribeConsent, readConsent, () => "unset");
  const ins = useRef<HTMLModElement>(null);

  useEffect(() => {
    const el = ins.current;
    if (consent !== "yes" || !el || el.dataset.adsbygoogleStatus) return;
    loadAdsenseScript(client);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Google refused this unit (for example, already filled); leave it empty.
    }
  }, [consent, client]);

  if (consent !== "yes") return null;
  return (
    <aside aria-label="Advertisement" className={`bx-adsense border-y border-mist py-3 ${className}`}>
      <p className="mb-2 text-center text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-slate">Advertisement</p>
      <div className="mx-auto w-full max-w-5xl">
        <ins
          ref={ins}
          className="adsbygoogle block"
          data-ad-client={client}
          data-ad-slot={unit}
          data-ad-format="auto"
          data-full-width-responsive="true"
          data-bx-place={place}
        />
      </div>
    </aside>
  );
}
