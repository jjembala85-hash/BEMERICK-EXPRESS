"use client";

import { useActionState, useEffect, useRef } from "react";
import { addNote, type NoteState } from "@/app/newsroom/(protected)/stories/actions";
import { submitWithoutReset } from "@/lib/forms";

export type NoteItem = { id: string; kind: string; body: string; author: string; when: string };

const kindLabels: Record<string, string> = {
  request_changes: "Sent back",
  spike: "Spiked",
  unpublish: "Unpublished",
  legal_hold: "Legal hold",
  legal_clear: "Legal hold cleared",
  note: "Note",
};

const kindTone: Record<string, string> = {
  request_changes: "border-crane-gold",
  spike: "border-ember",
  unpublish: "border-ember",
  legal_hold: "border-ember",
  legal_clear: "border-lake-ink",
};

/** Notes between writer and editor. Newsroom only; never shown to readers. */
export function StoryNotes({ articleId, notes }: { articleId: string; notes: NoteItem[] }) {
  const [state, action, pending] = useActionState<NoteState, FormData>(addNote, {});
  const box = useRef<HTMLTextAreaElement>(null);

  // Clear the box after each note is saved.
  useEffect(() => {
    if (state.ok && box.current) box.current.value = "";
  }, [state.ok]);

  return (
    <section aria-labelledby="notes-heading" className="mt-10 max-w-3xl">
      <h2 id="notes-heading" className="font-serif text-2xl font-bold text-ink">Editorial notes</h2>
      <p className="mt-1 text-sm text-slate">Seen only by the newsroom, never by readers.</p>

      {notes.length === 0 ? (
        <p className="mt-4 text-sm text-slate">No notes yet.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {notes.map((n) => (
            <li key={n.id} className={`rounded-md border-l-4 bg-surface px-4 py-3 ${kindTone[n.kind] ?? "border-mist"}`}>
              <p className="text-xs text-slate">
                <span className="font-semibold uppercase tracking-wide text-ink">{kindLabels[n.kind] ?? "Note"}</span>
                {" · "}
                {n.author} · {n.when}
              </p>
              <p className="mt-1 whitespace-pre-line text-ink">{n.body}</p>
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={submitWithoutReset(action)} className="mt-4">
        <input type="hidden" name="articleId" value={articleId} />
        <label htmlFor="new-note" className="sr-only">Add a note</label>
        <textarea
          ref={box}
          id="new-note"
          name="body"
          rows={2}
          maxLength={2000}
          placeholder="Add a note for the writer or editor"
          className="w-full rounded-md border border-mist bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20"
        />
        {state.error && (
          <p role="alert" className="mt-2 text-sm font-semibold text-ember">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md border border-lake-ink px-4 py-2 text-sm font-semibold text-lake-ink hover:bg-mist disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add note"}
        </button>
      </form>
    </section>
  );
}
