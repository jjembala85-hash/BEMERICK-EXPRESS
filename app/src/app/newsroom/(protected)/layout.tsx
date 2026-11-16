import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { count, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { article } from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { can, roleLabels } from "@/lib/permissions";
import { publishDueStories } from "@/lib/scheduling";
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
  const reviewer = can(staff.role, "article.review");
  // Tidy scheduled stories whose time has passed (readers already see them).
  await publishDueStories();
  const waiting = reviewer
    ? ((await getDb().select({ n: count() }).from(article).where(eq(article.status, "in_review")))[0]?.n ?? 0)
    : 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 bg-brand text-white">
        <div className="flex h-14 items-center gap-4 px-4">
          <Link href="/newsroom" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bx-mark-reverse.svg" alt="" width={30} height={30} />
            <span className="font-serif text-lg font-bold tracking-wide">BX Newsroom</span>
          </Link>
          <nav aria-label="Newsroom" className="flex items-center gap-1">
            <Link href="/newsroom" className="rounded px-2.5 py-1.5 text-sm font-semibold hover:bg-white/10">
              Dashboard
            </Link>
            <Link href="/newsroom/stories" className="rounded px-2.5 py-1.5 text-sm font-semibold hover:bg-white/10">
              Stories
            </Link>
            {reviewer && (
              <Link href="/newsroom/review" className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-semibold hover:bg-white/10">
                Review
                {waiting > 0 && (
                  <span className="rounded-full bg-accent px-1.5 text-xs font-bold text-brand-deep" aria-label={`${waiting} waiting`}>
                    {waiting}
                  </span>
                )}
              </Link>
            )}
          </nav>
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
