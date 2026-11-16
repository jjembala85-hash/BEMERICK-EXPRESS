"use client";

import { useActionState } from "react";
import { acceptInvite, type WelcomeState } from "./actions";

const inputClass =
  "w-full rounded-md border border-mist bg-surface px-3 py-2.5 text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20";

export function WelcomeForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState<WelcomeState, FormData>(acceptInvite, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {/* Lets password managers save the new password against the right account. */}
      <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-semibold text-ink">New password</label>
        <input id="password" name="password" type="password" required minLength={12} autoComplete="new-password" className={inputClass} />
        <p className="mt-1 text-xs text-slate">At least 12 characters. A short sentence works well.</p>
      </div>
      <div>
        <label htmlFor="confirm" className="mb-1 block text-sm font-semibold text-ink">Repeat password</label>
        <input id="confirm" name="confirm" type="password" required minLength={12} autoComplete="new-password" className={inputClass} />
      </div>
      {state.error && (
        <p role="alert" className="rounded-md bg-ember/10 px-3 py-2 text-sm font-semibold text-ember">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
      >
        {pending ? "Saving…" : "Set password"}
      </button>
    </form>
  );
}
