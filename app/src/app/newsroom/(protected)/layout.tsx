import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireStaff } from "@/lib/session";
import { roleLabels } from "@/lib/permissions";
import { signOut } from "../actions";

export const metadata: Metadata = {
  title: { template: "%s · BX Newsroom", default: "BX Newsroom" },
  robots: { index: false, follow: false },
};

export default function NewsroomLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="p-8 text-slate">Loading newsroom…</p>}>
      <NewsroomShell>{children}</NewsroomShell>
    </Suspense>
  );
}

async function NewsroomShell({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 bg-brand text-white">
        <div className="flex h-14 items-center gap-4 px-4">
          <Link href="/newsroom" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bx-mark-reverse.svg" alt="" width={30} height={30} />
            <span className="font-serif text-lg font-bold tracking-wide">BX Newsroom</span>
          </Link>
          <Link href="/" className="ml-auto hidden text-sm hover:underline sm:block">
            View site
          </Link>
          <span className="text-sm">
            {staff.name}
            <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-xs font-semibold text-brand-deep">
              {roleLabels[staff.role]}
            </span>
          </span>
          <form action={signOut}>
            <button type="submit" className="rounded px-2.5 py-1.5 text-sm font-semibold hover:bg-white/10">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
