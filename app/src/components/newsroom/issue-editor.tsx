"use client";

import { useActionState } from "react";
import { saveIssue, sendIssue, sendTest, type IssueState } from "@/app/newsroom/(protected)/newsletter/actions";
import { submitWithoutReset } from "@/lib/forms";

export type IssueChoice = { id: string; headline: string; section: string; when: string };

const inputClass =
  "w-full rounded-md border border-mist bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20";
const labelClass = "mb-1 block text-sm font-semibold text-ink";

function Notice({ state }: { state: IssueState }) {
  if (state.error) return <p role="alert" className="rounded-md bg-ember/10 px-3 py-2 text-sm font-semibold text-ember">{state.error}</p>;
  if (state.message) return <p role="status" className="rounded-md bg-mist px-3 py-2 text-sm font-semibold text-lake-ink">{state.message}</p>;
  return null;
}

export function IssueEditor({
  id,
  subject,
  intro,
  chosen,
  choices,
}: {
  id: string;
  subject: string;
  intro: string;
  chosen: string[];
  choices: IssueChoice[];
}) {
  const [state, action, pending] = useActionState<IssueState, FormData>(saveIssue, {});
  // Chosen stories first, in their saved order, then the rest.
  const ordered = [...chosen.map((c) => choices.find((s) => s.id === c)).filter((s): s is IssueChoice => Boolean(s)), ...choices.filter((s) => !chosen.includes(s.id))];
  return (
    <form onSubmit={submitWithoutReset(action)} className="space-y-4">
      <input type="hidden" name="issueId" value={id} />
      <div>
        <label htmlFor="subject" className={labelClass}>Subject line</label>
        <input id="subject" name="subject" required maxLength={120} defaultValue={subject} className={inputClass} />
      </div>
      <div>
        <label htmlFor="intro" className={labelClass}>Introduction (optional)</label>
        <textarea id="intro" name="intro" rows={3} maxLength={1000} defaultValue={intro} placeholder="Good morning. Today: …" className={inputClass} />
      </div>
      <fieldset>
        <legend className={labelClass}>Stories (the first one is shown biggest; up to 10)</legend>
        {ordered.length === 0 ? (
          <p className="text-sm text-slate">No stories were published in the last three days.</p>
        ) : (
          <ul className="max-h-96 space-y-1 overflow-y-auto rounded-md border border-mist p-2">
            {ordered.map((s) => (
              <li key={s.id}>
                <label className="flex items-start gap-2 rounded px-1 py-1 text-sm text-ink hover:bg-mist">
                  <input type="checkbox" name="articleIds" value={s.id} defaultChecked={chosen.includes(s.id)} className="mt-0.5 size-4 shrink-0 accent-lake-ink" />
                  <span>
                    <span className="font-semibold">{s.headline}</span>
                    <span className="block text-xs text-slate">{s.section} · {s.when}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
      <Notice state={state} />
      <button type="submit" disabled={pending} className="rounded-md bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-deep disabled:opacity-60">
        {pending ? "Saving…" : "Save edition"}
      </button>
    </form>
  );
}

export function SendButtons({ id, subscribers, mailReady }: { id: string; subscribers: number; mailReady: boolean }) {
  const [testState, testAction, testPending] = useActionState<IssueState, FormData>(sendTest, {});
  const [sendState, sendAction, sendPending] = useActionState<IssueState, FormData>(sendIssue, {});
  if (!mailReady) {
    return (
      <p className="rounded-md border border-dashed border-mist p-3 text-sm text-slate">
        Sending is switched off until the email service is set up (needs the domain). You can prepare and preview editions now.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <form onSubmit={submitWithoutReset(testAction)} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="issueId" value={id} />
        <button type="submit" disabled={testPending} className="rounded-md border border-lake-ink px-4 py-2 text-sm font-semibold text-lake-ink hover:bg-mist disabled:opacity-60">
          {testPending ? "Sending…" : "Send a test to me"}
        </button>
      </form>
      <Notice state={testState} />
      <form
        onSubmit={(e) => {
          if (!window.confirm(`Send this edition to ${subscribers} subscriber${subscribers === 1 ? "" : "s"} now? It cannot be unsent.`)) {
            e.preventDefault();
            return;
          }
          submitWithoutReset(sendAction)(e);
        }}
      >
        <input type="hidden" name="issueId" value={id} />
        <button type="submit" disabled={sendPending || subscribers === 0} className="rounded-md bg-[#c8401f] px-5 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {sendPending ? "Sending…" : `Send to ${subscribers.toLocaleString("en-GB")} subscriber${subscribers === 1 ? "" : "s"}`}
        </button>
      </form>
      <Notice state={sendState} />
      <p className="text-xs text-slate">Save your changes before sending: the saved version is what goes out.</p>
    </div>
  );
}
