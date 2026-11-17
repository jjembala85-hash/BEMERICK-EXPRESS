"use client";

import { useState } from "react";

/** Read-only text with a one-tap copy button, and an optional "open in app" link. */
export function CopyBox({
  id,
  label,
  text,
  open,
  note,
}: {
  id: string;
  label: string;
  text: string;
  open?: { href: string; label: string };
  note?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-mist bg-surface p-4">
      <label htmlFor={id} className="text-sm font-semibold text-ink">{label}</label>
      {note && <p className="mt-0.5 text-xs text-slate">{note}</p>}
      <textarea
        id={id}
        readOnly
        value={text}
        rows={Math.min(14, text.split("\n").length + 1)}
        onFocus={(e) => e.target.select()}
        className="mt-2 w-full rounded-md border border-mist bg-paper px-3 py-2 font-mono text-sm text-ink"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(text).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          }}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
        {open && (
          <a href={open.href} target="_blank" rel="noopener noreferrer" className="rounded-md border border-lake-ink px-4 py-2 text-sm font-semibold text-lake-ink hover:bg-mist">
            {open.label} ↗
          </a>
        )}
      </div>
    </div>
  );
}
