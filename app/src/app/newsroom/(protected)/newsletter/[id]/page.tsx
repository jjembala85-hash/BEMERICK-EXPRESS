import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/session";
import { formatEAT } from "@/lib/dates";
import { issueEmail, mailConfigured } from "@/lib/newsletter";
import { getIssue, issueStories, storyChoices, subscriberCounts } from "@/lib/queries/newsletter";
import { IssueEditor, SendButtons } from "@/components/newsroom/issue-editor";
import { deleteIssue } from "../actions";

export const metadata: Metadata = { title: "Newsletter edition" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function IssuePage({ params }: PageProps<"/newsroom/newsletter/[id]">) {
  await requireStaff("audience.manage");
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const issue = await getIssue(id);
  if (!issue) notFound();
  const [stories, choices, counts] = await Promise.all([issueStories(issue.articleIds), storyChoices(issue.articleIds), subscriberCounts()]);
  const preview = issueEmail({ subject: issue.subject, intro: issue.intro, stories }, null);

  return (
    <>
      <p className="text-sm"><Link href="/newsroom/newsletter" className="font-semibold text-lake-ink hover:underline">← Newsletter &amp; alerts</Link></p>
      <h1 className="mt-2 font-serif text-3xl font-bold text-ink">{issue.sentAt ? "Sent edition" : "Edition draft"}</h1>
      {issue.sentAt && (
        <p className="mt-1 text-slate">Sent {formatEAT(issue.sentAt)} to {issue.sentCount.toLocaleString("en-GB")} subscribers.</p>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          {issue.sentAt ? (
            <p className="rounded-lg border border-mist bg-surface p-4 text-ink"><strong>{issue.subject}</strong></p>
          ) : (
            <>
              <section className="rounded-lg border border-mist bg-surface p-5">
                <IssueEditor
                  id={issue.id}
                  subject={issue.subject}
                  intro={issue.intro ?? ""}
                  chosen={issue.articleIds}
                  choices={choices.map((c) => ({ id: c.id, headline: c.headline, section: c.section, when: c.publishedAt ? formatEAT(c.publishedAt) : "" }))}
                />
              </section>
              <section className="rounded-lg border border-mist bg-surface p-5">
                <h2 className="mb-3 font-serif text-lg font-bold text-ink">Send</h2>
                <SendButtons id={issue.id} subscribers={counts.confirmed} mailReady={mailConfigured()} />
              </section>
              <form action={deleteIssue}>
                <input type="hidden" name="issueId" value={issue.id} />
                <button type="submit" className="text-sm font-semibold text-ember hover:underline">Delete this draft</button>
              </form>
            </>
          )}
        </div>
        <section aria-label="Preview">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate">Preview (as saved)</h2>
          <iframe
            title="Email preview"
            srcDoc={preview.html}
            sandbox=""
            className="h-[48rem] w-full rounded-lg border border-mist bg-white"
          />
        </section>
      </div>
    </>
  );
}
