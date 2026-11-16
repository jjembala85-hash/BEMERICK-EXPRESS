"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import {
  addCorrection,
  setLegalHold,
  type SafetyState,
} from "@/app/newsroom/(protected)/stories/actions";

export type CorrectionItem = { id: string; body: string; when: string; author: string };
export type RevisionItem = { id: string; reason: string; when: string; author: string | null; headline: string };

const reasonLabels: Record<string, string> = {
  publish: "Published",
  update: "Edited while live",
  correction: "Correction added",
};

const inputClass =
  "w-full rounded-md border border-mist bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20";
const buttonClass =
  "rounded-md border px-4 py-2 text-sm font-semibold disabled:opacity-60";

/** Legal hold, corrections and revision history for one story (newsroom only). */
export function StorySafety({
  articleId,
  legalHold,
  canClearHold,
  canCorrect,
  published,
  corrections,
  revisions,
}: {
  articleId: string;
  legalHold: boolean;
  canClearHold: boolean;
  canCorrect: boolean;
  published: boolean;
  corrections: CorrectionItem[];
  revisions: RevisionItem[];
}) {
  const [holdState, holdAction, holdPending] = useActionState<SafetyState, FormData>(setLegalHold, {});
  const [fixState, fixAction, fixPending] = useActionState<SafetyState, FormData>(addCorrection, {});
  const fixBox = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (fixState.ok && fixBox.current) fixBox.current.value = "";
  }, [fixState.ok]);

  return (
    <section aria-labelledby="safety-heading" className="mt-10 max-w-3xl">
      <h2 id="safety-heading" className="font-serif text-2xl font-bold text-ink">Legal &amp; accuracy</h2>

      {/* Legal hold */}
      <div className="mt-4 rounded-lg border border-mist bg-surface p-4">
        <p className="font-semibold text-ink">
          Legal hold:{" "}
          <span className={legalHold ? "text-ember" : "text-lake-ink"}>{legalHold ? "On" : "Off"}</span>
        </p>
        <p className="mt-1 text-sm text-slate">
          {legalHold
            ? "Publishing is blocked until an administrator clears the hold."
            : "Flag the story if anything in it may need a lawyer's check (for example a serious allegation)."}
        </p>
        {(!legalHold || canClearHold) && (
          <form action={holdAction} className="mt-3 space-y-2">
            <input type="hidden" name="articleId" value={articleId} />
            <input type="hidden" name="on" value={legalHold ? "false" : "true"} />
            <label htmlFor="hold-reason" className="sr-only">Reason</label>
            <textarea
              id="hold-reason"
              name="reason"
              rows={2}
              maxLength={2000}
              placeholder={legalHold ? "Optional: what the lawyer said" : "What needs legal review?"}
              className={inputClass}
            />
            <button
              type="submit"
              disabled={holdPending}
              className={`${buttonClass} ${legalHold ? "border-lake-ink text-lake-ink hover:bg-mist" : "border-ember text-ember hover:bg-ember/10"}`}
            >
              {legalHold ? "Clear legal hold" : "Flag for legal review"}
            </button>
          </form>
        )}
        {holdState.error && <p role="alert" className="mt-2 text-sm font-semibold text-ember">{holdState.error}</p>}
      </div>

      {/* Corrections */}
      <div className="mt-4 rounded-lg border border-mist bg-surface p-4">
        <p className="font-semibold text-ink">Corrections</p>
        <p className="mt-1 text-sm text-slate">
          Shown to readers under the story with the date, and listed on the public Corrections page.
        </p>
        {corrections.length > 0 && (
          <ol className="mt-3 space-y-2">
            {corrections.map((c) => (
              <li key={c.id} className="rounded-md border-l-4 border-crane-gold bg-paper px-3 py-2 text-sm">
                <p className="text-xs text-slate">{c.when} · {c.author}</p>
                <p className="mt-0.5 text-ink">{c.body}</p>
              </li>
            ))}
          </ol>
        )}
        {canCorrect && published ? (
          <form
            action={fixAction}
            className="mt-3 space-y-2"
            onSubmit={(e) => {
              if (!window.confirm("Publish this correction? Readers will see it under the story.")) e.preventDefault();
            }}
          >
            <input type="hidden" name="articleId" value={articleId} />
            <label htmlFor="correction" className="sr-only">Correction</label>
            <textarea
              ref={fixBox}
              id="correction"
              name="body"
              rows={2}
              maxLength={1000}
              placeholder="e.g. An earlier version of this story said the bridge cost UGX 2bn. It cost UGX 2.4bn."
              className={inputClass}
            />
            <button type="submit" disabled={fixPending} className={`${buttonClass} border-crane-gold text-ink hover:bg-crane-gold/15`}>
              {fixPending ? "Adding…" : "Add correction"}
            </button>
            <p className="text-xs text-slate">Fix the story text too, then save it; the correction explains the change.</p>
          </form>
        ) : (
          !published && <p className="mt-2 text-sm text-slate">Corrections can be added once the story has been published.</p>
        )}
        {fixState.error && <p role="alert" className="mt-2 text-sm font-semibold text-ember">{fixState.error}</p>}
      </div>

      {/* Revision history */}
      <div className="mt-4 rounded-lg border border-mist bg-surface p-4">
        <p className="font-semibold text-ink">Revision history</p>
        <p className="mt-1 text-sm text-slate">A copy is kept each time readers get a new version.</p>
        {revisions.length === 0 ? (
          <p className="mt-2 text-sm text-slate">No published versions yet.</p>
        ) : (
          <ol className="mt-3 divide-y divide-mist text-sm">
            {revisions.map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 py-2">
                <span className="font-semibold text-ink">{reasonLabels[r.reason] ?? r.reason}</span>
                <span className="text-slate">{r.when}{r.author ? ` · ${r.author}` : ""}</span>
                <Link href={`/newsroom/stories/${articleId}/revisions/${r.id}`} className="ml-auto font-semibold text-lake-ink hover:underline">
                  View
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
