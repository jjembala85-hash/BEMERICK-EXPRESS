"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

// Readers can hide a banner; it stays hidden for that alert only, on this device.
const KEY = "bx-breaking-dismissed";
const EVENT = "bx-breaking-dismissed";

function readDismissed() {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}
function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Site-wide breaking-news strip in Ember, the colour reserved for Breaking and Live. */
export function BreakingBanner({ id, text, href }: { id: string; text: string; href: string | null }) {
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => "");
  if (dismissed === id) return null;

  const label = (
    <>
      <span className="mr-2 inline-flex items-center gap-1.5 font-bold uppercase tracking-[0.08em]">
        <span className="size-2 rounded-full bg-white motion-safe:animate-pulse" aria-hidden />
        Breaking
      </span>
      <span className="font-semibold">{text}</span>
    </>
  );

  return (
    <div role="region" aria-label="Breaking news" className="bg-[#c8401f] text-white">
      <div className="mx-auto flex max-w-5xl items-start gap-3 px-4 py-2.5 text-[0.95rem] leading-snug">
        {href ? (
          <Link href={href} className="flex-1 hover:underline">{label}</Link>
        ) : (
          <p className="flex-1">{label}</p>
        )}
        <button
          type="button"
          aria-label="Hide breaking news banner"
          className="-my-1 rounded px-2 py-1 text-lg leading-none hover:bg-white/15"
          onClick={() => {
            try {
              window.localStorage.setItem(KEY, id);
            } catch {
              // Storage unavailable: hide until the page reloads.
            }
            window.dispatchEvent(new Event(EVENT));
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
