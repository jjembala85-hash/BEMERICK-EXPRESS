"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { previousPageIsOurs } from "@/lib/nav-history";

/**
 * "← Back" (D-048). Goes to the previous page when the reader came from
 * elsewhere on BX News; otherwise (arrived from WhatsApp, Google, a bookmark)
 * it opens `fallback`, so it never takes readers away from the site.
 */
export function BackButton({ fallback, label = "Back" }: { fallback: string; label?: string }) {
  const router = useRouter();
  return (
    <Link
      href={fallback}
      onClick={(e) => {
        if (previousPageIsOurs()) {
          e.preventDefault();
          router.back();
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-md py-1 pr-2 text-sm font-semibold text-lake-ink hover:underline"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {label}
    </Link>
  );
}
