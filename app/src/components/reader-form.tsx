"use client";

import { useActionState, useRef } from "react";
import { sendMessage, type SendState } from "@/app/(public)/contact/actions";
import { submitWithoutReset } from "@/lib/forms";
import type { MessageKind } from "@/lib/reader-forms";

const inputClass =
  "w-full rounded-md border border-mist bg-surface px-3 py-2.5 text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20";
const labelClass = "mb-1 block text-sm font-semibold text-ink";

const copy: Record<MessageKind, { body: string; bodyHint: string; replyLabel: string; button: string; done: string }> = {
  contact: {
    body: "Your message",
    bodyHint: "",
    replyLabel: "Email or phone, so we can reply",
    button: "Send message",
    done: "Thank you. Your message has reached the BX News team. We reply to most messages within two working days.",
  },
  tip: {
    body: "What happened?",
    bodyHint: "Where and when, who is involved, and how you know. Do not include anything that identifies you unless you want to.",
    replyLabel: "Email or phone (optional, only if you want us to contact you)",
    button: "Send tip",
    done: "Thank you. Your tip has reached our editors. If you left a contact, a journalist may get in touch before we publish anything.",
  },
  advertise: {
    body: "What would you like to promote?",
    bodyHint: "The product or campaign, your budget range and dates if you know them.",
    replyLabel: "Email or phone, so we can reply",
    button: "Send enquiry",
    done: "Thank you. Our advertising team will reply within two working days.",
  },
};

export function ReaderForm({ kind }: { kind: MessageKind }) {
  const [state, action, pending] = useActionState<SendState, FormData>(sendMessage, {});
  // Set when the reader first clicks into the form, so instant (robot) submissions can be told apart.
  const started = useRef<HTMLInputElement>(null);
  const text = copy[kind];

  if (state.sent) {
    return (
      <p role="status" className="rounded-lg border-l-4 border-lake-ink bg-surface p-4 text-ink">
        {text.done}
      </p>
    );
  }

  return (
    <form
      onSubmit={submitWithoutReset(action)}
      onFocusCapture={() => {
        if (started.current && !started.current.value) started.current.value = String(Date.now());
      }}
      className="space-y-4"
    >
      <input type="hidden" name="kind" value={kind} />
      <input ref={started} type="hidden" name="startedAt" defaultValue="" />
      {/* Trap for robots: hidden from people and screen readers. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${kind}-website`}>Leave this empty</label>
        <input id={`${kind}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${kind}-name`} className={labelClass}>Name{kind === "tip" ? " (optional)" : ""}</label>
          <input id={`${kind}-name`} name="name" maxLength={80} autoComplete={kind === "tip" ? "off" : "name"} className={inputClass} />
        </div>
        <div>
          <label htmlFor={`${kind}-reply`} className={labelClass}>{text.replyLabel}</label>
          <input
            id={`${kind}-reply`}
            name="replyTo"
            maxLength={120}
            required={kind !== "tip"}
            autoComplete={kind === "tip" ? "off" : "email"}
            className={inputClass}
          />
        </div>
      </div>
      {kind !== "tip" && (
        <div>
          <label htmlFor={`${kind}-subject`} className={labelClass}>Subject (optional)</label>
          <input id={`${kind}-subject`} name="subject" maxLength={120} className={inputClass} />
        </div>
      )}
      <div>
        <label htmlFor={`${kind}-body`} className={labelClass}>{text.body}</label>
        {text.bodyHint && <p id={`${kind}-body-hint`} className="mb-1 text-sm text-slate">{text.bodyHint}</p>}
        <textarea
          id={`${kind}-body`}
          name="body"
          required
          minLength={10}
          maxLength={5000}
          rows={7}
          aria-describedby={text.bodyHint ? `${kind}-body-hint` : undefined}
          className={inputClass}
        />
      </div>
      {state.error && <p role="alert" className="rounded-md bg-ember/10 px-3 py-2 text-sm font-semibold text-ember">{state.error}</p>}
      <button type="submit" disabled={pending} className="rounded-md bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-deep disabled:opacity-60">
        {pending ? "Sending…" : text.button}
      </button>
    </form>
  );
}
