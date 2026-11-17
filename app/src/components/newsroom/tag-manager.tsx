"use client";

import { useActionState } from "react";
import { deleteTag, mergeTag, updateTag, type TagState } from "@/app/newsroom/(protected)/tags/actions";
import { submitWithoutReset } from "@/lib/forms";

export type TagRowValue = { id: string; name: string; slug: string; description: string; stories: number };

const inputClass =
  "w-full rounded-md border border-mist bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20";
const labelClass = "mb-1 block text-xs font-semibold text-slate";
const smallButton = "rounded-md border px-3 py-1.5 text-sm font-semibold disabled:opacity-60";

function Notice({ state }: { state: TagState }) {
  if (state.error) return <p role="alert" className="text-sm font-semibold text-ember">{state.error}</p>;
  if (state.message) return <p role="status" className="text-sm font-semibold text-lake-ink">{state.message}</p>;
  return null;
}

/** One tag: rename and describe it, merge it into another, or delete it. */
export function TagRow({ value, others }: { value: TagRowValue; others: { id: string; name: string }[] }) {
  const [saveState, saveAction, saving] = useActionState<TagState, FormData>(updateTag, {});
  const [mergeState, mergeAction, merging] = useActionState<TagState, FormData>(mergeTag, {});
  const [deleteState, deleteAction, deleting] = useActionState<TagState, FormData>(deleteTag, {});
  const confirmThen = (message: string, action: (fd: FormData) => void) => (e: React.FormEvent<HTMLFormElement>) => {
    if (!window.confirm(message)) {
      e.preventDefault();
      return;
    }
    submitWithoutReset(action)(e);
  };

  return (
    <details className="group rounded-lg border border-mist bg-surface">
      <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
        <span className="font-semibold text-ink group-open:text-lake-ink">{value.name}</span>
        <span className="text-sm text-slate">
          {value.stories} {value.stories === 1 ? "story" : "stories"}
        </span>
        <span className="text-sm text-slate">/topic/{value.slug}</span>
        <span className="ml-auto text-sm font-semibold text-lake-ink group-open:hidden">Edit</span>
      </summary>
      <div className="space-y-5 border-t border-mist px-4 py-4">
        <form onSubmit={submitWithoutReset(saveAction)} className="space-y-3">
          <input type="hidden" name="tagId" value={value.id} />
          <div className="grid gap-3 sm:grid-cols-[16rem_minmax(0,1fr)]">
            <div>
              <label htmlFor={`name-${value.id}`} className={labelClass}>Name</label>
              <input id={`name-${value.id}`} name="name" required maxLength={40} defaultValue={value.name} className={inputClass} />
            </div>
            <div>
              <label htmlFor={`desc-${value.id}`} className={labelClass}>Description on the topic page (optional)</label>
              <input id={`desc-${value.id}`} name="description" maxLength={300} defaultValue={value.description} className={inputClass} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={saving} className={`${smallButton} border-brand bg-brand text-white hover:bg-brand-deep`}>
              {saving ? "Saving…" : "Save"}
            </button>
            <a href={`/topic/${value.slug}`} target="_blank" rel="noopener" className="text-sm font-semibold text-lake-ink hover:underline">
              View topic page ↗
            </a>
            <Notice state={saveState} />
          </div>
          <p className="text-xs text-slate">Renaming keeps the web address, so shared links keep working.</p>
        </form>

        {others.length > 0 && (
          <form
            onSubmit={confirmThen(`Merge “${value.name}” into the chosen tag? “${value.name}” will be removed.`, mergeAction)}
            className="flex flex-wrap items-end gap-2"
          >
            <input type="hidden" name="tagId" value={value.id} />
            <div className="min-w-48 flex-1 sm:max-w-xs">
              <label htmlFor={`into-${value.id}`} className={labelClass}>Merge into (for duplicates)</label>
              <select id={`into-${value.id}`} name="intoId" defaultValue="" required className={inputClass}>
                <option value="" disabled>Choose a tag…</option>
                {others.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={merging} className={`${smallButton} border-lake-ink text-lake-ink hover:bg-mist`}>
              {merging ? "Merging…" : "Merge"}
            </button>
            <Notice state={mergeState} />
          </form>
        )}

        <form
          onSubmit={confirmThen(`Delete “${value.name}”? It is removed from ${value.stories} ${value.stories === 1 ? "story" : "stories"}.`, deleteAction)}
          className="flex flex-wrap items-center gap-3"
        >
          <input type="hidden" name="tagId" value={value.id} />
          <button type="submit" disabled={deleting} className={`${smallButton} border-ember text-ember hover:bg-ember/10`}>
            {deleting ? "Deleting…" : "Delete tag"}
          </button>
          <Notice state={deleteState} />
        </form>
      </div>
    </details>
  );
}
