"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { confirmSubscription, subscribe, unsubscribe, type LinkState, type SignupState } from "@/app/(public)/newsletter/actions";
import { submitWithoutReset } from "@/lib/forms";

/** Email sign-up. `compact` is the one-line version used in the footer. */
export function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const [state, action, pending] = useActionState<SignupState, FormData>(subscribe, {});
  const started = useRef<HTMLInputElement>(null);
  if (state.sent) {
    return (
      <p role="status" className="text-sm font-semibold">
        Check your inbox: we sent you a link to confirm. It can take a few minutes, and may land in Promotions or Spam.
      </p>
    );
  }
  return (
    <form
      onSubmit={submitWithoutReset(action)}
      onFocusCapture={() => {
        if (started.current && !started.current.value) started.current.value = String(Date.now());
      }}
      className="space-y-2"
    >
      <input ref={started} type="hidden" name="startedAt" defaultValue="" />
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <label htmlFor={compact ? "nl-email-footer" : "nl-email"} className={compact ? "sr-only" : "block text-sm font-semibold"}>Your email address</label>
      <div className="flex flex-wrap gap-2">
        <input
          id={compact ? "nl-email-footer" : "nl-email"}
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-md border border-mist bg-surface px-3 py-2 text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20"
        />
        <button type="submit" disabled={pending} className="rounded-md bg-accent px-4 py-2 font-semibold text-brand-deep hover:opacity-90 disabled:opacity-60">
          {pending ? "Sending…" : "Sign up"}
        </button>
      </div>
      {state.error && <p role="alert" className="text-sm font-semibold">{state.error}</p>}
      <p className="text-xs opacity-80">
        Free. We keep only your email and never share it. Unsubscribe in one tap. <Link href="/privacy" className="underline">Privacy</Link>
      </p>
    </form>
  );
}

/** The Confirm / Unsubscribe button on the pages that email links open (a tap, not just a visit, so link scanners cannot do it). */
export function LinkAction({ kind, id, token }: { kind: "confirm" | "unsubscribe"; id: string; token: string }) {
  const [state, action, pending] = useActionState<LinkState, FormData>(kind === "confirm" ? confirmSubscription : unsubscribe, {});
  if (state.done) {
    return (
      <p role="status" className="rounded-lg border-l-4 border-lake-ink bg-surface p-4 text-ink">
        {kind === "confirm"
          ? "You're subscribed. The next BX News briefing will arrive in your inbox."
          : "You're unsubscribed. You will not get any more newsletters from us."}
      </p>
    );
  }
  return (
    <form onSubmit={submitWithoutReset(action)} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="t" value={token} />
      <button type="submit" disabled={pending} className="rounded-md bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-deep disabled:opacity-60">
        {pending ? "Working…" : kind === "confirm" ? "Confirm my subscription" : "Unsubscribe"}
      </button>
      {state.error && <p role="alert" className="font-semibold text-ember">{state.error}</p>}
    </form>
  );
}
