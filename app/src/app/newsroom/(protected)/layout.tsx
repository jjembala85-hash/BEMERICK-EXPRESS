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

  const links = [
    { href: "/newsroom", label: "Dashboard", show: true },
    { href: "/newsroom/stories", label: "Stories", show: true },
    { href: "/newsroom/review", label: "Review", show: reviewer, badge: waiting },
    { href: "/newsroom/media", label: "Photos", show: can(staff.role, "media.upload") },
    { href: "/newsroom/homepage", label: "Homepage", show: can(staff.role, "homepage.manage") },
    { href: "/newsroom/staff", label: "Staff", show: can(staff.role, "staff.manage") },
  ].filter((l) => l.show);
  const navLinks = links.map((l) => (
    <Link
      key={l.href}
      href={l.href}
      className="flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-semibold hover:bg-white/10"
    >
      {l.label}
      {l.badge ? (
        <span className="rounded-full bg-accent px-1.5 text-xs font-bold text-brand-deep" aria-label={`${l.badge} waiting`}>
          {l.badge}
        </span>
      ) : null}
    </Link>
  ));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 bg-brand text-white">
        <div className="flex h-14 items-center gap-3 px-4">
          <Link href="/newsroom" className="flex shrink-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bx-mark-reverse.svg" alt="" width={30} height={30} />
            <span className="whitespace-nowrap font-serif text-lg font-bold tracking-wide">BX Newsroom</span>
          </Link>
          {/* Wide screens: links in the bar. */}
          <nav aria-label="Newsroom" className="hidden items-center gap-1 lg:flex">
            {navLinks}
          </nav>
          <Link href="/" className="ml-auto hidden whitespace-nowrap text-sm hover:underline sm:block">
            View site
          </Link>
          <Link
            href="/newsroom/profile"
            title="My profile"
            className="ml-auto flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-white/10 sm:ml-0"
          >
            <span className="hidden whitespace-nowrap md:inline">{staff.name}</span>
            <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-semibold text-brand-deep">
              {roleLabels[staff.role]}
            </span>
          </Link>
          <form action={signOut}>
            <button type="submit" className="whitespace-nowrap rounded px-2.5 py-1.5 text-sm font-semibold hover:bg-white/10">
              Sign out
            </button>
          </form>
        </div>
        {/* Phones and tablets: a swipeable row of links under the bar. */}
        <nav
          aria-label="Newsroom"
          className="flex gap-1 overflow-x-auto border-t border-white/10 px-2 py-1.5 [scrollbar-width:none] lg:hidden"
        >
          {navLinks}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
