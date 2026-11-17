import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireStaff } from "@/lib/session";
import { mustUseTwoFactor } from "@/lib/two-factor";
import { signOut } from "../actions";
import { ManageTwoFactor, SetupFlow } from "./security-panel";

export const metadata: Metadata = { title: "Security · BX Newsroom", robots: { index: false, follow: false } };

// Lives outside the main newsroom layout on purpose: admins and editors who
// have not set up two-step sign-in can reach only this page.
export default function SecurityPage({ searchParams }: PageProps<"/newsroom/security">) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="bg-brand text-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bx-mark-reverse.svg" alt="" width={30} height={30} />
          <span className="font-serif text-lg font-bold">BX Newsroom</span>
          <form action={signOut} className="ml-auto">
            <button type="submit" className="rounded px-2.5 py-1.5 text-sm font-semibold hover:bg-white/10">Sign out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Suspense fallback={<p className="text-slate">Loading…</p>}>
          <Security searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

async function Security({ searchParams }: Pick<PageProps<"/newsroom/security">, "searchParams">) {
  const staff = await requireStaff(undefined, { allowWithoutTwoFactor: true });
  const sp = await searchParams;
  const required = mustUseTwoFactor(staff.role);

  return (
    <>
      {!staff.needsTwoFactorSetup && (
        <Link href="/newsroom" className="text-sm font-semibold text-lake-ink hover:underline">← Newsroom</Link>
      )}
      <h1 className="mt-2 font-serif text-3xl font-bold text-ink">Two-step sign-in</h1>
      <p className="mt-1 text-slate">
        After your password, you also type a 6-digit code from an app on your phone. A stolen password alone is then not
        enough to get into the newsroom.
      </p>

      {sp.on === "1" && (
        <p role="status" className="mt-5 rounded-md bg-mist px-3 py-2 font-semibold text-lake-ink">
          Two-step sign-in is on. Next time you sign in, have your phone ready.{" "}
          <Link href="/newsroom" className="underline">Go to the newsroom</Link>
        </p>
      )}
      {sp.off === "1" && (
        <p role="status" className="mt-5 rounded-md bg-mist px-3 py-2 font-semibold text-ink">Two-step sign-in is off.</p>
      )}
      {staff.needsTwoFactorSetup && (
        <p role="alert" className="mt-5 rounded-md border-l-4 border-crane-gold bg-surface px-4 py-3 text-ink">
          <span className="font-semibold">Set this up to continue.</span> Administrators and editors can publish stories and
          change accounts, so two-step sign-in is required for them. It takes about two minutes.
        </p>
      )}

      <section className="mt-6 rounded-lg border border-mist bg-surface p-5">
        <p className="mb-4 font-semibold text-ink">
          Status:{" "}
          <span className={staff.twoFactorEnabled ? "text-lake-ink" : "text-ember"}>{staff.twoFactorEnabled ? "On" : "Off"}</span>
          {required && <span className="ml-2 text-sm font-normal text-slate">(required for your role)</span>}
        </p>
        {staff.twoFactorEnabled ? <ManageTwoFactor canTurnOff={!required} /> : <SetupFlow />}
      </section>
    </>
  );
}
