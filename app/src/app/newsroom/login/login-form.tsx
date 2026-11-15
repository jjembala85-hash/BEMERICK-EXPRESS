"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "../actions";

const initial: SignInState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initial);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-semibold text-ink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="w-full rounded-md border border-mist bg-paper px-3 py-2.5 text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-semibold text-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-md border border-mist bg-paper px-3 py-2.5 text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20"
        />
      </div>
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
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
