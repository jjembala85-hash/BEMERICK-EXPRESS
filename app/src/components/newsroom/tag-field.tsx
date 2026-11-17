"use client";

import { useId, useState } from "react";
import { MAX_TAGS } from "@/lib/tags";

/**
 * Comma-separated tags with suggestions from tags already in use, so the
 * newsroom reuses "Fuel prices" instead of creating "fuel price" next to it.
 */
export function TagField({
  initial,
  suggestions,
  inputClass,
  labelClass,
}: {
  initial: string;
  suggestions: string[];
  inputClass: string;
  labelClass: string;
}) {
  const [value, setValue] = useState(initial);
  const hintId = useId();
  const parts = value.split(",");
  const current = parts[parts.length - 1].trim().toLowerCase();
  const chosen = new Set(parts.slice(0, -1).map((p) => p.trim().toLowerCase()));
  const matches = current
    ? suggestions.filter((s) => s.toLowerCase().includes(current) && !chosen.has(s.toLowerCase()) && s.toLowerCase() !== current).slice(0, 6)
    : [];

  function pick(name: string) {
    const before = parts.slice(0, -1).map((p) => p.trim()).filter(Boolean);
    setValue([...before, name].join(", ") + ", ");
  }

  return (
    <div>
      <label htmlFor="tags" className={labelClass}>Tags</label>
      <input
        id="tags"
        name="tags"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          // Enter picks the first suggestion instead of submitting the story.
          if (e.key === "Enter") {
            e.preventDefault();
            if (matches[0]) pick(matches[0]);
          }
        }}
        maxLength={400}
        autoComplete="off"
        aria-describedby={hintId}
        placeholder="e.g. Elections 2026, Fuel prices"
        className={`${inputClass} text-sm`}
      />
      {matches.length > 0 && (
        <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Existing tags">
          {matches.map((m) => (
            <li key={m}>
              <button
                type="button"
                onClick={() => pick(m)}
                className="rounded-full border border-lake-ink/40 px-2.5 py-0.5 text-xs font-semibold text-lake-ink hover:bg-mist"
              >
                {m}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p id={hintId} className="mt-1 text-xs text-slate">
        Separate with commas, up to {MAX_TAGS}. Each tag gets a topic page readers can follow.
      </p>
    </div>
  );
}
