"use client";

import { useEffect } from "react";

/** Counts one read for "Most read" after the reader has stayed 5 seconds. Sends only the story's id. */
export function StoryView({ id }: { id: string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      const url = `/api/view/${id}`;
      if (!navigator.sendBeacon?.(url)) fetch(url, { method: "POST", keepalive: true }).catch(() => {});
    }, 5000);
    return () => clearTimeout(timer);
  }, [id]);
  return null;
}
