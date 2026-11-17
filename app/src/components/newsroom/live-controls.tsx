"use client";

import { useActionState, useEffect, useRef } from "react";
import { createStream, setStreamStatus, updateStream, type LiveState } from "@/app/newsroom/(protected)/live/actions";
import { submitWithoutReset } from "@/lib/forms";

export type StreamValues = {
  id: string;
  title: string;
  youtube: string;
  summary: string;
  scheduledStart: string; // datetime-local, EAT
  keyPoints: string; // one per line
  relatedArticleId: string;
  status: "scheduled" | "live" | "ended";
  when: string;
};

export type StoryOption = { id: string; headline: string };

const inputClass =
  "w-full rounded-md border border-mist bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20";
const labelClass = "mb-1 block text-xs font-semibold text-slate";
const primary = "rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60";
const quiet = "rounded-md border border-mist px-3 py-1.5 text-sm font-semibold text-ink hover:bg-mist disabled:opacity-60";

function Notice({ state }: { state: LiveState }) {
  if (state.error) return <p role="alert" className="text-sm font-semibold text-ember">{state.error}</p>;
  if (state.message) return <p role="status" className="text-sm font-semibold text-lake-ink">{state.message}</p>;
  return null;
}

function Fields({ values, stories, prefix }: { values?: StreamValues; stories: StoryOption[]; prefix: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor={`${prefix}-title`} className={labelClass}>Title</label>
        <input id={`${prefix}-title`} name="title" required maxLength={120} defaultValue={values?.title} placeholder="e.g. Budget speech 2026/27, live from Kololo" className={inputClass} />
      </div>
      <div>
        <label htmlFor={`${prefix}-youtube`} className={labelClass}>YouTube link</label>
        <input id={`${prefix}-youtube`} name="youtube" required inputMode="url" defaultValue={values?.youtube} placeholder="https://youtube.com/live/…" className={inputClass} />
      </div>
      <div>
        <label htmlFor={`${prefix}-start`} className={labelClass}>Starts (EAT)</label>
        <input id={`${prefix}-start`} name="scheduledStart" type="datetime-local" defaultValue={values?.scheduledStart} className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${prefix}-summary`} className={labelClass}>What&apos;s on (optional)</label>
        <textarea id={`${prefix}-summary`} name="summary" rows={2} maxLength={500} defaultValue={values?.summary} className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${prefix}-points`} className={labelClass}>Key points: one per line, update them during the stream</label>
        <textarea
          id={`${prefix}-points`}
          name="keyPoints"
          rows={4}
          defaultValue={values?.keyPoints}
          placeholder={"Minister announces fuel levy cut\nSchool fees support raised to UGX 50bn"}
          className={inputClass}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${prefix}-related`} className={labelClass}>Related story (optional)</label>
        <select id={`${prefix}-related`} name="relatedArticleId" defaultValue={values?.relatedArticleId ?? ""} className={inputClass}>
          <option value="">None</option>
          {stories.map((s) => (
            <option key={s.id} value={s.id}>{s.headline}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function NewStream({ stories }: { stories: StoryOption[] }) {
  const [state, action, pending] = useActionState<LiveState, FormData>(createStream, {});
  const form = useRef<HTMLFormElement>(null);
  // Clear the form once the stream is saved, so it is not added twice.
  useEffect(() => {
    if (state.message) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} onSubmit={submitWithoutReset(action)} className="space-y-3">
      <Fields stories={stories} prefix="new" />
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="goLive" className="size-4 accent-lake-ink" /> Go live now (otherwise it is scheduled)
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={primary}>{pending ? "Saving…" : "Add stream"}</button>
        <Notice state={state} />
      </div>
    </form>
  );
}

function StatusButton({ id, to, label, confirm, className }: { id: string; to: string; label: string; confirm?: string; className: string }) {
  const [state, action, pending] = useActionState<LiveState, FormData>(setStreamStatus, {});
  return (
    <form
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) {
          e.preventDefault();
          return;
        }
        submitWithoutReset(action)(e);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="streamId" value={id} />
      <input type="hidden" name="to" value={to} />
      <button type="submit" disabled={pending} className={className}>{pending ? "Working…" : label}</button>
      <Notice state={state} />
    </form>
  );
}

export function StreamCard({ values, stories }: { values: StreamValues; stories: StoryOption[] }) {
  const [state, action, pending] = useActionState<LiveState, FormData>(updateStream, {});
  const live = values.status === "live";
  return (
    <div className={`rounded-lg border bg-surface p-4 ${live ? "border-2 border-[#c8401f]" : "border-mist"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded px-2 py-0.5 text-xs font-bold tracking-wider ${
            live ? "bg-[#c8401f] text-white" : values.status === "scheduled" ? "bg-crane-gold/25 text-ink" : "bg-mist text-slate"
          }`}
        >
          {live ? "● ON AIR" : values.status === "scheduled" ? "SCHEDULED" : "ENDED"}
        </span>
        <span className="font-semibold text-ink">{values.title}</span>
        <span className="text-sm text-slate">{values.when}</span>
        <span className="ml-auto flex flex-wrap gap-2">
          {values.status === "scheduled" && (
            <StatusButton id={values.id} to="live" label="Go live" confirm="Go live now? The LIVE pill appears on every page." className="rounded-md bg-[#c8401f] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60" />
          )}
          {values.status === "ended" && (
            <StatusButton id={values.id} to="live" label="Go live again" confirm="Put this ended stream back on air? The LIVE pill appears on every page." className={quiet} />
          )}
          {live && <StatusButton id={values.id} to="ended" label="End stream" confirm="End this stream? The LIVE pill disappears." className={`${quiet} border-ember text-ember`} />}
          {!live && <StatusButton id={values.id} to="delete" label="Delete" confirm="Delete this stream?" className={quiet} />}
        </span>
      </div>
      <details className="mt-3" open={live}>
        <summary className="cursor-pointer text-sm font-semibold text-lake-ink">{live ? "Update while on air" : "Edit"}</summary>
        <form onSubmit={submitWithoutReset(action)} className="mt-3 space-y-3">
          <input type="hidden" name="streamId" value={values.id} />
          <Fields values={values} stories={stories} prefix={values.id} />
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={pending} className={primary}>{pending ? "Saving…" : "Save"}</button>
            <Notice state={state} />
          </div>
        </form>
      </details>
    </div>
  );
}
