"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CONSENT_OPEN_EVENT, readConsent, saveConsent, subscribeConsent } from "@/lib/consent";

/**
 * Asks readers whether Google may show ads with cookies (D-049). Rendered only
 * when AdSense is switched on. Accept and No thanks carry equal weight, nothing
 * is loaded from Google before Accept, and the reading experience is the same
 * either way apart from the ads.
 */
export function ConsentBanner() {
  const consent = useSyncExternalStore(subscribeConsent, readConsent, () => null);
  const [reopened, setReopened] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const open = () => setReopened(true);
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
  }, []);

  // When reopened from "Cookie settings", move focus into the banner.
  useEffect(() => {
    if (reopened) box.current?.querySelector("button")?.focus();
  }, [reopened]);

  if (consent === null || (consent !== "unset" && !reopened)) return null;

  const choose = (ads: boolean) => {
    setReopened(false);
    saveConsent(ads);
  };

  return (
    <div
      ref={box}
      role="region"
      aria-label="Cookie choice"
      className="fixed inset-x-0 bottom-0 z-10 border-t-[3px] border-crane-gold bg-brand-deep text-[#e4ecea] shadow-[0_-4px_16px_rgba(0,0,0,0.25)]"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-6">
        <p className="flex-1 text-sm leading-relaxed">
          <strong className="text-white">BX News is free to read because of advertising.</strong> May Google show ads here
          and use cookies to choose and measure them? Say no and you can still read everything.{" "}
          <Link href="/cookies" className="underline hover:text-white">How we use cookies</Link>
        </p>
        {/* Same look for both answers, so neither is pushed. */}
        <div className="flex shrink-0 gap-2">
          {([[false, "No thanks"], [true, "Accept"]] as const).map(([ads, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => choose(ads)}
              className="flex-1 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-brand-deep hover:bg-[#e4ecea] sm:flex-none"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Footer link that shows the banner again so readers can change their mind. */
export function CookieSettingsButton({ className = "text-sm hover:text-white hover:underline" }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))} className={className}>
      Cookie settings
    </button>
  );
}
