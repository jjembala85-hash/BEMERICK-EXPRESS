"use client";

import { useActionState, useState } from "react";
import { saveStory, type StoryState } from "@/app/newsroom/(protected)/stories/actions";
import { RichTextEditor } from "./rich-text-editor";

export type StoryFormValues = {
  id?: string;
  status: string;
  headline: string;
  standfirst: string;
  sectionId: string;
  type: string;
  slug: string;
  body: unknown;
  slugLocked: boolean;
};

const inputClass =
  "w-full rounded-md border border-mist bg-surface px-3 py-2.5 text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20";
const labelClass = "mb-1 block text-sm font-semibold text-ink";

const typeOptions = [
  ["news", "News"],
  ["analysis", "Analysis"],
  ["opinion", "Opinion"],
  ["feature", "Feature"],
] as const;

export function StoryForm({
  values,
  sections,
  canPublish,
  canUnpublish,
  flash,
}: {
  values: StoryFormValues;
  sections: { id: string; name: string }[];
  canPublish: boolean;
  canUnpublish: boolean;
  flash?: string;
}) {
  const [state, action, pending] = useActionState<StoryState, FormData>(saveStory, {});
  const [headline, setHeadline] = useState(values.headline);
  const published = values.status === "published";
  const notice = state.message ?? flash;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <div className="space-y-5">
        <div>
          <label htmlFor="headline" className={labelClass}>Headline</label>
          <input
            id="headline"
            name="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={160}
            required
            className={`${inputClass} font-serif text-2xl font-bold`}
          />
          <p className={`mt-1 text-xs ${headline.length > 110 ? "text-ember" : "text-slate"}`}>
            {headline.length} characters. Aim for under 110.
          </p>
        </div>
        <div>
          <label htmlFor="standfirst" className={labelClass}>Standfirst</label>
          <textarea
            id="standfirst"
            name="standfirst"
            defaultValue={values.standfirst}
            rows={2}
            maxLength={300}
            className={`${inputClass} font-serif italic`}
          />
          <p className="mt-1 text-xs text-slate">One sentence that sums up the story. Required to publish.</p>
        </div>
        <div>
          <span className={labelClass}>Story</span>
          <RichTextEditor name="body" initial={values.body} />
        </div>
      </div>

      <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-lg border border-mist bg-surface p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate">
            Status: <span className={published ? "text-lake-ink" : "text-ink"}>{values.status.replace("_", " ")}</span>
          </p>
          {state.error && (
            <p role="alert" className="mb-3 rounded-md bg-ember/10 px-3 py-2 text-sm font-semibold text-ember">
              {state.error}
            </p>
          )}
          {!state.error && notice && (
            <p role="status" className="mb-3 rounded-md bg-mist px-3 py-2 text-sm font-semibold text-lake-ink">
              {notice}
            </p>
          )}
          <div className="space-y-2">
            <button
              type="submit"
              name="intent"
              value="save"
              disabled={pending}
              className="w-full rounded-md border border-lake-ink px-4 py-2.5 font-semibold text-lake-ink hover:bg-mist disabled:opacity-60"
            >
              {pending ? "Saving…" : published ? "Save changes (live)" : "Save draft"}
            </button>
            {canPublish && !published && (
              <button
                type="submit"
                name="intent"
                value="publish"
                disabled={pending}
                className="w-full rounded-md bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
              >
                Publish now
              </button>
            )}
            {canUnpublish && published && (
              <button
                type="submit"
                name="intent"
                value="unpublish"
                disabled={pending}
                className="w-full rounded-md border border-ember px-4 py-2.5 font-semibold text-ember hover:bg-ember/10 disabled:opacity-60"
              >
                Unpublish
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-mist bg-surface p-4">
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
              className={`${inputClass} text-sm ${values.slugLocked ? "opacity-60" : ""}`}
            />
            <p className="mt-1 text-xs text-slate">
              {values.slugLocked
                ? "Fixed after first publish so shared links keep working."
                : "Leave empty to create it from the headline."}
            </p>
          </div>
        </div>
      </aside>
    </form>
  );
}
