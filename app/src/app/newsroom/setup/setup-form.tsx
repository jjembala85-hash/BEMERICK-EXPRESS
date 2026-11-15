"use client";

import { useActionState } from "react";
import { createFirstAdmin, type SetupState } from "./actions";

const initial: SetupState = {};
const inputClass =
  "w-full rounded-md border border-mist bg-paper px-3 py-2.5 text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20";
const labelClass = "mb-1 block text-sm font-semibold text-ink";

export function SetupForm({ askForKey }: { askForKey: boolean }) {
  const [state, action, pending] = useActionState(createFirstAdmin, initial);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="name" className={labelClass}>Full name</label>
        <input id="name" name="name" autoComplete="name" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="email" className={labelClass}>Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required className={inputClass} />
        <p className="mt-1 text-xs text-slate">At least 12 characters.</p>
      </div>
      <div>
        <label htmlFor="confirm" className={labelClass}>Repeat password</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={12} required className={inputClass} />
      </div>
      {askForKey && (
        <div>
          <label htmlFor="setupKey" className={labelClass}>Setup key</label>
          <input id="setupKey" name="setupKey" type="password" required className={inputClass} />
        </div>
      )}
      {state.error && (
        <p role="alert" className="rounded-md bg-ember/10 px-3 py-2 text-sm font-semibold text-ember">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create administrator account"}
      </button>
    </form>
  );
}
