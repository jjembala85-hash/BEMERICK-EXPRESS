import type { Metadata } from "next";
import { Suspense } from "react";
import { findInvite } from "@/lib/invites";
import { WelcomeForm } from "./welcome-form";

export const metadata: Metadata = {
  title: "Set your password",
  robots: { index: false, follow: false },
  referrer: "no-referrer", // keep the one-time link out of other sites' logs
};

export default function WelcomePage({ searchParams }: PageProps<"/newsroom/welcome">) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-brand px-4 py-10">
      <div className="w-full max-w-sm rounded-xl bg-surface p-7 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bx-mark.svg" alt="" width={40} height={40} />
          <div>
            <p className="font-serif text-xl font-bold leading-tight text-ink">BX Newsroom</p>
            <p className="text-sm text-slate">Welcome to the team</p>
          </div>
        </div>
        <Suspense fallback={<p className="text-slate">Checking your link…</p>}>
          <Welcome searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Welcome({ searchParams }: { searchParams: PageProps<"/newsroom/welcome">["searchParams"] }) {
  const raw = (await searchParams).token;
  const token = typeof raw === "string" ? raw : "";
  const invite = await findInvite(token);

  if (!invite) {
    return (
      <p className="rounded-md bg-ember/10 px-3 py-2.5 text-sm font-semibold text-ember">
        This link has expired or was already used. Ask your administrator for a new one.
      </p>
    );
  }
  return (
    <>
      <p className="mb-5 text-ink">
        Hello <span className="font-semibold">{invite.name}</span>. Choose a password for{" "}
        <span className="font-semibold">{invite.email}</span>.
      </p>
      <WelcomeForm token={token} email={invite.email} />
    </>
  );
}
