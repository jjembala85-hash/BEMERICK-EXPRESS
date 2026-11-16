"use client";

import { useActionState, useState } from "react";
import { saveStory, type StoryState } from "@/app/newsroom/(protected)/stories/actions";
import {
  GOES_PUBLIC,
  NOTE_REQUIRED,
  PUBLISH_CHECKLIST,
  actionLabels,
  statusLabels,
  type Status,
  type WorkflowAction,
} from "@/lib/workflow";
import { RichTextEditor } from "./rich-text-editor";
import { LeadPhoto, type LeadPhotoValue } from "./lead-photo";
import { submitWithoutReset } from "@/lib/forms";

export type StoryFormValues = {
  id?: string;
  status: Status;
  headline: string;
  standfirst: string;
  sectionId: string;
  type: string;
  slug: string;
  body: unknown;
  slugLocked: boolean;
  leadPhoto?: LeadPhotoValue | null;
  /** "Goes live 17 Nov 2026, 08:00 EAT" for scheduled stories. */
  scheduledLabel?: string;
  legalHold?: boolean;
};

const inputClass =
  "w-full rounded-md border border-mist bg-surface px-3 py-2.5 text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20 read-only:opacity-70 disabled:opacity-70";
const labelClass = "mb-1 block text-sm font-semibold text-ink";

const typeOptions = [
  ["news", "News"],
  ["analysis", "Analysis"],
  ["opinion", "Opinion"],
  ["feature", "Feature"],
] as const;

const buttonStyle: Record<WorkflowAction, string> = {
  submit: "bg-brand text-white hover:bg-brand-deep",
  approve_publish: "bg-brand text-white hover:bg-brand-deep",
  publish: "bg-brand text-white hover:bg-brand-deep",
  approve: "border border-lake-ink text-lake-ink hover:bg-mist",
  schedule: "border border-lake-ink text-lake-ink hover:bg-mist",
  unschedule: "border border-lake-ink text-lake-ink hover:bg-mist",
  restore: "border border-lake-ink text-lake-ink hover:bg-mist",
  request_changes: "border border-crane-gold text-ink hover:bg-crane-gold/15",
  spike: "border border-ember text-ember hover:bg-ember/10",
  unpublish: "border border-ember text-ember hover:bg-ember/10",
};

const confirmText: Partial<Record<WorkflowAction, string>> = {
  spike: "Spike this story? It will not be published.",
  unpublish: "Unpublish this story? Readers will no longer see it.",
  publish: "Publish this story now?",
  approve_publish: "Approve and publish this story now?",
};

const statusTone: Partial<Record<Status, string>> = {
  published: "text-lake-ink",
  scheduled: "text-lake-ink",
  changes_requested: "text-ember",
  spiked: "text-ember",
  unpublished: "text-ember",
};

export function StoryForm({
  values,
  sections,
  actions,
  editable,
  storageReady,
  flash,
}: {
  values: StoryFormValues;
  sections: { id: string; name: string }[];
  actions: WorkflowAction[];
  editable: boolean;
  storageReady: boolean;
  flash?: string;
}) {
  const [state, action, pending] = useActionState<StoryState, FormData>(saveStory, {});
  const [headline, setHeadline] = useState(values.headline);
  const live = values.status === "published";
  const notice = state.message ?? flash;
  const needsNote = actions.some((a) => NOTE_REQUIRED.has(a));
  const canSchedule = actions.includes("schedule");
  const otherActions = actions.filter((a) => a !== "schedule");
  const needsChecklist = actions.some((a) => GOES_PUBLIC.has(a));

  return (
    <form onSubmit={submitWithoutReset(action)} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <div className="space-y-5">
        {values.legalHold && (
          <p role="status" className="rounded-md border-l-4 border-ember bg-ember/10 px-4 py-3 text-sm font-semibold text-ember">
            Legal review needed. This story cannot be published or scheduled until an administrator clears the hold.
          </p>
        )}
        {!editable && (
          <p className="rounded-md border border-mist bg-mist/60 px-4 py-3 text-sm text-ink">
            {values.status === "in_review"
              ? "This story is with an editor. You can read it, but changes wait until it comes back to you."
              : "This story can't be edited at its current stage."}
          </p>
        )}
        <div>
          <label htmlFor="headline" className={labelClass}>Headline</label>
          <input
            id="headline"
            name="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={160}
            required
            readOnly={!editable}
            className={`${inputClass} font-serif text-2xl font-bold`}
          />
          {editable && (
            <p className={`mt-1 text-xs ${headline.length > 110 ? "text-ember" : "text-slate"}`}>
              {headline.length} characters. Aim for under 110.
            </p>
          )}
        </div>
        <div>
          <label htmlFor="standfirst" className={labelClass}>Standfirst</label>
          <textarea
            id="standfirst"
            name="standfirst"
            defaultValue={values.standfirst}
            rows={2}
            maxLength={300}
            readOnly={!editable}
            className={`${inputClass} font-serif italic`}
          />
          {editable && (
            <p className="mt-1 text-xs text-slate">One sentence that sums up the story. Needed before review.</p>
          )}
        </div>
        <div>
          <span className={labelClass}>Story</span>
          <RichTextEditor name="body" initial={values.body} editable={editable} />
        </div>
      </div>

      <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-lg border border-mist bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">
            Status: <span className={statusTone[values.status] ?? "text-ink"}>{statusLabels[values.status]}</span>
          </p>
          {values.scheduledLabel && <p className="mt-1 text-sm text-ink">{values.scheduledLabel}</p>}

          {state.error && (
            <p role="alert" className="mt-3 rounded-md bg-ember/10 px-3 py-2 text-sm font-semibold text-ember">
              {state.error}
            </p>
          )}
          {!state.error && notice && (
            <p role="status" className="mt-3 rounded-md bg-mist px-3 py-2 text-sm font-semibold text-lake-ink">
              {notice}
            </p>
          )}

          <div className="mt-3 space-y-2">
            {editable && (
              <button
                type="submit"
                name="intent"
                value="save"
                disabled={pending}
                className="w-full rounded-md border border-lake-ink px-4 py-2.5 font-semibold text-lake-ink hover:bg-mist disabled:opacity-60"
              >
                {pending ? "Saving…" : live ? "Save changes (live)" : values.id ? "Save draft" : "Save as draft"}
              </button>
            )}

            {otherActions.map((a) => (
              <button
                key={a}
                type="submit"
                name="intent"
                value={a}
                disabled={pending}
                onClick={(e) => {
                  const text = confirmText[a];
                  if (text && !window.confirm(text)) e.preventDefault();
                }}
                className={`w-full rounded-md px-4 py-2.5 font-semibold disabled:opacity-60 ${buttonStyle[a]}`}
              >
                {actionLabels[a]}
              </button>
            ))}
          </div>

          {needsChecklist && (
            <fieldset className="mt-4 border-t border-mist pt-4">
              <legend className="text-sm font-semibold text-ink">Before publishing, confirm:</legend>
              <div className="mt-2 space-y-2">
                {PUBLISH_CHECKLIST.map((c) => (
                  <label key={c.key} className="flex items-start gap-2 text-sm text-ink">
                    <input type="checkbox" name={`check_${c.key}`} className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand)]" />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {canSchedule && (
            <div className="mt-4 border-t border-mist pt-4">
              <label htmlFor="scheduleAt" className={labelClass}>Publish at (EAT)</label>
              <input id="scheduleAt" name="scheduleAt" type="datetime-local" className={`${inputClass} text-sm`} />
              <button
                type="submit"
                name="intent"
                value="schedule"
                disabled={pending}
                className={`mt-2 w-full rounded-md px-4 py-2.5 font-semibold disabled:opacity-60 ${buttonStyle.schedule}`}
              >
                {actionLabels.schedule}
              </button>
            </div>
          )}

          {needsNote && (
            <div className="mt-4 border-t border-mist pt-4">
              <label htmlFor="note" className={labelClass}>
                {actions.includes("unpublish") ? "Reason for unpublishing" : "Note to the writer"}
              </label>
              <textarea
                id="note"
                name="note"
                rows={3}
                maxLength={2000}
                className={`${inputClass} text-sm`}
                placeholder={
                  actions.includes("unpublish") ? "Kept on record" : "Needed to send back or spike"
                }
              />
            </div>
          )}

          {actions.length === 0 && !editable && (
            <p className="mt-3 text-sm text-slate">Nothing for you to do on this story right now.</p>
          )}
        </div>

        {editable ? (
          <LeadPhoto initial={values.leadPhoto} storageReady={storageReady} />
        ) : (
          values.leadPhoto && (
            <div className="rounded-lg border border-mist bg-surface p-4">
              <p className={labelClass}>Lead photo</p>
              <input type="hidden" name="leadMediaId" value={values.leadPhoto.id} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={values.leadPhoto.previewUrl} alt={values.leadPhoto.altText} className="aspect-video w-full rounded-md bg-mist object-cover" />
              <p className="mt-1 text-xs text-slate">Photo: {values.leadPhoto.credit}</p>
            </div>
          )
        )}

        <fieldset disabled={!editable} className="space-y-4 rounded-lg border border-mist bg-surface p-4">
          <div>
            <label htmlFor="sectionId" className={labelClass}>Section</label>
            <select id="sectionId" name="sectionId" defaultValue={values.sectionId} required className={inputClass}>
              <option value="" disabled>Choose…</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="type" className={labelClass}>Type</label>
            <select id="type" name="type" defaultValue={values.type} className={inputClass}>
              {typeOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="slug" className={labelClass}>Web address ending</label>
            <input
              id="slug"
              name="slug"
              defaultValue={values.slug}
              readOnly={values.slugLocked}
              placeholder="made from the headline"
              className={`${inputClass} text-sm`}
            />
            <p className="mt-1 text-xs text-slate">
              {values.slugLocked
                ? "Fixed once a story is live or scheduled, so shared links keep working."
                : "Leave empty to create it from the headline."}
            </p>
          </div>
        </fieldset>
      </aside>
    </form>
  );
}
