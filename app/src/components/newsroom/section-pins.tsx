"use client";

import { useActionState } from "react";
import { pinSection, type BoardState } from "@/app/newsroom/(protected)/homepage/actions";
import { submitWithoutReset } from "@/lib/forms";

export type PinRow = {
  sectionId: string;
  name: string;
  pinnedId: string;
  until: string; // datetime-local, EAT
  stories: { id: string; headline: string }[];
};

const inputClass =
  "w-full rounded-md border border-mist bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20";

function PinForm({ row }: { row: PinRow }) {
  const [state, action, pending] = useActionState<BoardState, FormData>(pinSection, {});
  return (
    <form onSubmit={submitWithoutReset(action)} className="grid gap-2 border-t border-mist py-3 first:border-t-0 sm:grid-cols-[8rem_minmax(0,1fr)_12rem_auto] sm:items-center">
      <input type="hidden" name="sectionId" value={row.sectionId} />
      <label htmlFor={`pin-${row.sectionId}`} className="text-sm font-semibold text-ink">{row.name}</label>
      <select id={`pin-${row.sectionId}`} name="articleId" defaultValue={row.pinnedId} className={inputClass}>
        <option value="">Not pinned (newest first)</option>
        {row.stories.map((s) => (
          <option key={s.id} value={s.id}>{s.headline}</option>
        ))}
      </select>
      <label className="sr-only" htmlFor={`until-${row.sectionId}`}>Pinned until (optional, EAT)</label>
      <input id={`until-${row.sectionId}`} name="until" type="datetime-local" defaultValue={row.until} title="Until (optional, EAT)" className={inputClass} />
      <button type="submit" disabled={pending} className="rounded-md border border-lake-ink px-3 py-2 text-sm font-semibold text-lake-ink hover:bg-mist disabled:opacity-60">
        {pending ? "Saving…" : "Save"}
      </button>
      {(state.error || state.message) && (
        <p role={state.error ? "alert" : "status"} className={`text-sm font-semibold sm:col-span-4 ${state.error ? "text-ember" : "text-lake-ink"}`}>
          {state.error ?? state.message}
        </p>
      )}
    </form>
  );
}

export function SectionPins({ rows }: { rows: PinRow[] }) {
  return (
    <section className="mt-10 rounded-lg border border-mist bg-surface p-5">
      <h2 className="font-serif text-xl font-bold text-ink">Section pins</h2>
      <p className="mt-1 text-sm text-slate">
        One story per section shown first in that section&apos;s header menu and at the top of its page. Leave &ldquo;until&rdquo; empty to keep
        it pinned until you change it.
      </p>
      <div className="mt-3">
        {rows.map((row) => (
          <PinForm key={row.sectionId} row={row} />
        ))}
      </div>
    </section>
  );
}
