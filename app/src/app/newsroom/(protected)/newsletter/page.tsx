import type { Metadata } from "next";
import Link from "next/link";
import { count } from "drizzle-orm";
import { getDb } from "@/db";
import { pushSubscription } from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { formatEAT } from "@/lib/dates";
import { mailConfigured } from "@/lib/newsletter";
import { pushConfigured } from "@/lib/push";
import { readerSignupsEnabled } from "@/lib/site";
import { listIssues, subscriberCounts } from "@/lib/queries/newsletter";
import { pruneUnconfirmed } from "@/lib/newsletter-db";
import { newIssue } from "./actions";

export const metadata: Metadata = { title: "Newsletter & alerts" };

export default async function NewsletterAdminPage() {
  await requireStaff("audience.manage");
  // Keeps the privacy promise even when nobody new signs up: unconfirmed sign-ups go after 7 days.
  await pruneUnconfirmed();
  const [counts, issues, [{ n: alertCount }]] = await Promise.all([
    subscriberCounts(),
    listIssues(),
    getDb().select({ n: count() }).from(pushSubscription),
  ]);
  const open = readerSignupsEnabled();

  return (
    <>
      <h1 className="font-serif text-3xl font-bold text-ink">Newsletter &amp; alerts</h1>
      <p className="mt-1 max-w-3xl text-slate">
        Readers sign up from the site footer and <a href="/newsletter" target="_blank" rel="noopener" className="font-semibold text-lake-ink hover:underline">/newsletter ↗</a>.
        Breaking-news alerts are sent from the breaking banner on the Homepage page.
      </p>

      <dl className="mt-6 grid gap-3 sm:grid-cols-4">
        {[
          { label: "Newsletter subscribers", value: counts.confirmed },
          { label: "Waiting to confirm", value: counts.pending },
          { label: "Unsubscribed", value: counts.unsubscribed },
          { label: "Alert sign-ups", value: alertCount },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-mist bg-surface p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-slate">{s.label}</dt>
            <dd className="mt-1 font-serif text-3xl font-bold text-ink">{s.value.toLocaleString("en-GB")}</dd>
          </div>
        ))}
      </dl>

      <ul className="mt-4 space-y-1 text-sm">
        <li>Reader sign-ups: <strong className={open ? "text-lake-ink" : "text-ember"}>{open ? "open" : "closed until the data protection registration"}</strong></li>
        <li>Email sending: <strong className={mailConfigured() ? "text-lake-ink" : "text-ember"}>{mailConfigured() ? "ready" : "not set up yet (needs the domain)"}</strong></li>
        <li>Phone and browser alerts: <strong className={pushConfigured() ? "text-lake-ink" : "text-ember"}>{pushConfigured() ? "ready" : "not set up"}</strong></li>
      </ul>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-bold text-ink">Editions</h2>
          <form action={newIssue}>
            <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep">Start a new edition</button>
          </form>
        </div>
        {issues.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-mist p-4 text-slate">No editions yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-mist rounded-lg border border-mist bg-surface">
            {issues.map((i) => (
              <li key={i.id}>
                <Link href={`/newsroom/newsletter/${i.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-mist">
                  <span className={`rounded px-2 py-0.5 text-xs font-bold tracking-wider ${i.sentAt ? "bg-lake-ink text-white" : "bg-crane-gold/25 text-ink"}`}>
                    {i.sentAt ? "SENT" : i.sentCount > 0 ? "PARTLY SENT" : "DRAFT"}
                  </span>
                  <span className="font-semibold text-ink">{i.subject}</span>
                  <span className="ml-auto text-sm text-slate">
                    {i.sentAt ? `${formatEAT(i.sentAt)} · ${i.sentCount.toLocaleString("en-GB")} sent` : `${i.articleIds.length} stories`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
