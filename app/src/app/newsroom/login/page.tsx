import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { needsSetup } from "@/lib/setup";
import { LoginForm } from "./login-form";

async function LoginFootnote() {
  await connection(); // checked per visit, never cached
  if (await needsSetup()) {
    return (
      <p className="mt-5 rounded-md bg-mist px-3 py-2.5 text-sm text-ink">
        No accounts exist yet.{" "}
        <Link href="/newsroom/setup" className="font-semibold text-lake-ink underline">
          Create the first administrator
        </Link>
      </p>
    );
  }
  return (
    <p className="mt-5 text-xs text-slate">
      Accounts are created by an administrator. There is no public sign-up.
    </p>
  );
}

export const metadata: Metadata = { title: "Newsroom sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-brand px-4 py-10">
      <div className="w-full max-w-sm rounded-xl bg-surface p-7 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bx-mark.svg" alt="" width={40} height={40} />
          <div>
            <p className="font-serif text-xl font-bold leading-tight text-ink">BX Newsroom</p>
            <p className="text-sm text-slate">Staff sign in</p>
          </div>
        </div>
        <LoginForm />
        <Suspense
          fallback={
            <p className="mt-5 text-xs text-slate">
              Accounts are created by an administrator. There is no public sign-up.
            </p>
          }
        >
          <LoginFootnote />
        </Suspense>
      </div>
    </main>
  );
}
