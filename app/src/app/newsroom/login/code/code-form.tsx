"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { verifySignInCode, type CodeState } from "../../actions";
import { submitWithoutReset } from "@/lib/forms";

const inputClass =
  "w-full rounded-md border border-mist bg-paper px-3 py-2.5 text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20";

export function CodeForm() {
  const [state, action, pending] = useActionState<CodeState, FormData>(verifySignInCode, {});
  const [backup, setBackup] = useState(false);

  if (state.expired) {
    return (
      <div className="space-y-4">
        <p role="alert" className="rounded-md bg-ember/10 px-3 py-2 text-sm font-semibold text-ember">{state.error}</p>
        <Link href="/newsroom/login" className="block w-full rounded-md bg-brand px-4 py-2.5 text-center font-semibold text-white hover:bg-brand-deep">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submitWithoutReset(action)} className="space-y-4">
      <input type="hidden" name="method" value={backup ? "backup" : "app"} />
      <div>
        <label htmlFor="code" className="mb-1 block text-sm font-semibold text-ink">
          {backup ? "Backup code" : "6-digit code from your authenticator app"}
        </label>
        <input
          key={backup ? "backup" : "app"}
          id="code"
          name="code"
          required
          autoFocus
          autoComplete="one-time-code"
          inputMode={backup ? "text" : "numeric"}
          maxLength={backup ? 32 : 9}
          placeholder={backup ? "" : "123 456"}
          className={`${inputClass} ${backup ? "" : "text-center font-mono text-2xl tracking-[0.3em]"}`}
        />
      </div>
      <label className="flex items-start gap-2 text-sm text-ink">
        <input type="checkbox" name="trustDevice" className="mt-0.5 size-4 accent-lake-ink" />
        <span>
          This is my own device. Don&apos;t ask for a code here for 30 days.
          <span className="block text-xs text-slate">Leave unticked on shared newsroom computers.</span>
        </span>
      </label>
      {state.error && (
        <p role="alert" className="rounded-md bg-ember/10 px-3 py-2 text-sm font-semibold text-ember">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
      >
        {pending ? "Checking…" : "Continue"}
      </button>
      <button type="button" onClick={() => setBackup((b) => !b)} className="w-full text-sm font-semibold text-lake-ink hover:underline">
        {backup ? "Use the authenticator app instead" : "Lost your phone? Use a backup code"}
      </button>
    </form>
  );
}
