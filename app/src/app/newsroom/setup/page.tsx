import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { needsSetup, setupKeyRequired } from "@/lib/setup";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Newsroom setup" };

export default function SetupPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-brand px-4 py-10">
      <div className="w-full max-w-sm rounded-xl bg-surface p-7 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bx-mark.svg" alt="" width={40} height={40} />
          <div>
            <p className="font-serif text-xl font-bold leading-tight text-ink">BX Newsroom</p>
            <p className="text-sm text-slate">First-time setup</p>
          </div>
        </div>
        <Suspense fallback={<p className="text-slate">Checking…</p>}>
          <SetupGate />
        </Suspense>
      </div>
    </main>
  );
}

async function SetupGate() {
  await connection(); // checked per visit, never at build time
  if (!(await needsSetup())) redirect("/newsroom/login");
  return (
    <>
      <p className="mb-5 text-sm text-slate">
        Create the first administrator. This page works once and then closes
        for good; more staff are added from inside the newsroom.
      </p>
      <SetupForm askForKey={setupKeyRequired()} />
    </>
  );
}
