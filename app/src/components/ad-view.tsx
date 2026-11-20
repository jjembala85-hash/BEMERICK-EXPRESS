"use client";

import { useEffect, useRef } from "react";

/**
 * Counts one view when at least half the banner has been on screen for a second
 * (the usual ad industry rule). Sends only the ad's id; nothing about the reader.
 */
export function AdView({ id, children }: { id: string; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        clearTimeout(timer);
        if (!entry.isIntersecting) return;
        timer = setTimeout(() => {
          observer.disconnect();
          const url = `/api/ad/${id}`;
          if (!navigator.sendBeacon?.(url)) fetch(url, { method: "POST", keepalive: true }).catch(() => {});
        }, 1000);
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [id]);
  return <div ref={box}>{children}</div>;
}
