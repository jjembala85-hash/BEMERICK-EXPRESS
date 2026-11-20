"use client";

import { useActionState } from "react";
import {
  clearBreaking,
  saveBoard,
  startBreaking,
  type BoardState,
} from "@/app/newsroom/(protected)/homepage/actions";
import { BREAKING_DURATIONS, TOP_SLOTS } from "@/lib/homepage";
import { submitWithoutReset } from "@/lib/forms";

export type BoardStory = { id: string; headline: string; section: string; when: string };
export type BoardSlot = { articleId: string; overrideHeadline: string; until: string };

const inputClass =
  "w-full rounded-md border border-mist bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20";
const labelClass = "mb-1 block text-xs font-semibold text-slate";

function Notice({ state }: { state: BoardState }) {
  if (state.error) return <p role="alert" className="rounded-md bg-ember/10 px-3 py-2 text-sm font-semibold text-ember">{state.error}</p>;
  if (state.message) return <p role="status" className="rounded-md bg-mist px-3 py-2 text-sm font-semibold text-lake-ink">{state.message}</p>;
  return null;
}

function Place({
  name,
  label,
  stories,
  initial,
  big = false,
}: {
  name: string;
  label: string;
  stories: BoardStory[];
  initial?: BoardSlot;
  big?: boolean;
}) {
  return (
    <fieldset className={`rounded-lg border border-mist bg-surface p-4 ${big ? "border-l-4 border-l-crane-gold" : ""}`}>
      <legend className="px-1 text-sm font-bold uppercase tracking-[0.08em] text-ink">{label}</legend>
      <label htmlFor={`${name}-article`} className="sr-only">{label} story</label>
      <select id={`${name}-article`} name={`${name}-article`} defaultValue={initial?.articleId ?? ""} className={inputClass}>
        <option value="">Automatic (newest stories)</option>
        {stories.map((s) => (
          <option key={s.id} value={s.id}>
            {s.headline} · {s.section} · {s.when}
          </option>
        ))}
      </select>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${name}-headline`} className={labelClass}>Homepage headline (optional)</label>
          <input
            id={`${name}-headline`}
            name={`${name}-headline`}
            defaultValue={initial?.overrideHeadline ?? ""}
            maxLength={120}
            placeholder="Shorter headline for the homepage only"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`${name}-until`} className={labelClass}>Pin until, EAT (optional)</label>
          <input id={`${name}-until`} name={`${name}-until`} type="datetime-local" defaultValue={initial?.until ?? ""} className={inputClass} />
        </div>
      </div>
    </fieldset>
  );
}

export function HomepageBoard({
  stories,
  slots,
  breaking,
  alertSubscribers,
}: {
  stories: BoardStory[];
  slots: Record<string, BoardSlot>;
  breaking: { text: string; until: string; story: string | null } | null;
  /** Browsers signed up for alerts; null when alerts are not set up. */
  alertSubscribers: number | null;
}) {
  const [boardState, boardAction, boardPending] = useActionState<BoardState, FormData>(saveBoard, {});
  const [startState, startAction, startPending] = useActionState<BoardState, FormData>(startBreaking, {});
  const [clearState, clearAction, clearPending] = useActionState<BoardState>(clearBreaking, {});

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <form onSubmit={submitWithoutReset(boardAction)} className="space-y-4">
        <Place name="lead-0" label="Lead" stories={stories} initial={slots["lead-0"]} big />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: TOP_SLOTS }, (_, i) => (
            <Place key={i} name={`top-${i + 1}`} label={`Top story ${i + 1}`} stories={stories} initial={slots[`top-${i + 1}`]} />
          ))}
        </div>
        <p className="text-sm text-slate">
          A place left on <span className="font-semibold">Automatic</span>, or whose pin time has passed, shows the newest
          stories instead. A story is never shown twice.
        </p>
        <Notice state={boardState} />
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={boardPending}
            className="rounded-md bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
          >
            {boardPending ? "Saving…" : "Save homepage"}
          </button>
          <a href="/" target="_blank" rel="noopener" className="rounded-md border border-lake-ink px-5 py-2.5 font-semibold text-lake-ink hover:bg-mist">
            View homepage ↗
          </a>
        </div>
      </form>

      <aside className="space-y-4">
        <div className="rounded-lg border-2 border-ember bg-surface p-4">
          <h2 className="flex items-center gap-2 font-bold uppercase tracking-[0.08em] text-ember">
            <span className="size-2 rounded-full bg-ember" aria-hidden /> Breaking banner
          </h2>
          {breaking ? (
            <div className="mt-3">
              <p className="font-semibold text-ink">{breaking.text}</p>
              <p className="mt-1 text-sm text-slate">
                Showing until {breaking.until}
                {breaking.story ? ` · links to “${breaking.story}”` : ""}
              </p>
              <form onSubmit={submitWithoutReset(clearAction)} className="mt-3">
                <button
                  type="submit"
                  disabled={clearPending}
                  className="rounded-md border border-ember px-4 py-2 text-sm font-semibold text-ember hover:bg-ember/10 disabled:opacity-60"
                >
                  {clearPending ? "Removing…" : "Remove banner now"}
                </button>
              </form>
              <div className="mt-2"><Notice state={clearState} /></div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate">No banner is showing.</p>
          )}

          <form onSubmit={submitWithoutReset(startAction)} className="mt-4 space-y-3 border-t border-mist pt-4">
            <p className="text-sm font-semibold text-ink">{breaking ? "Replace with a new banner" : "Start a banner"}</p>
            <div>
              <label htmlFor="breaking-text" className={labelClass}>Headline</label>
              <input id="breaking-text" name="text" maxLength={140} required placeholder="e.g. Heavy flooding closes Jinja Road" className={inputClass} />
            </div>
            <div>
              <label htmlFor="breaking-story" className={labelClass}>Link to story (optional)</label>
              <select id="breaking-story" name="articleId" defaultValue="" className={inputClass}>
                <option value="">No link</option>
                {stories.map((s) => (
                  <option key={s.id} value={s.id}>{s.headline}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="breaking-hours" className={labelClass}>Show for</label>
              <select id="breaking-hours" name="hours" defaultValue="3" className={inputClass}>
                {BREAKING_DURATIONS.map((h) => (
                  <option key={h} value={h}>{h} hour{h === 1 ? "" : "s"}</option>
                ))}
              </select>
            </div>
            {alertSubscribers !== null && (
              <label className="flex items-start gap-2 text-sm text-ink">
                <input type="checkbox" name="sendAlert" className="mt-0.5 size-4 accent-lake-ink" />
                <span>
                  Also send an alert to {alertSubscribers.toLocaleString("en-GB")} phone{alertSubscribers === 1 ? "" : "s"} and browser{alertSubscribers === 1 ? "" : "s"}
                  <span className="block text-xs text-slate">Only for big news: too many alerts and readers switch them off. Tapping it opens the linked story.</span>
                </span>
              </label>
            )}
            <Notice state={startState} />
            <button
              type="submit"
              disabled={startPending}
              onClick={(e) => {
                if (!window.confirm("Show this breaking banner on every page now?")) e.preventDefault();
              }}
              className="w-full rounded-md bg-[#c8401f] px-4 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {startPending ? "Starting…" : "Show breaking banner"}
            </button>
            <p className="text-xs text-slate">One banner at a time. It switches itself off when the time runs out.</p>
          </form>
        </div>
      </aside>
    </div>
  );
}
