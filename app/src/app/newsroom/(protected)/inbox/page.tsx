import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { readerMessage } from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { formatEAT } from "@/lib/dates";
import { MESSAGE_KINDS, type MessageKind } from "@/lib/reader-forms";
import { MessageControls } from "@/components/newsroom/inbox-controls";
import { pruneOldMessages } from "@/lib/inbox";

export const metadata: Metadata = { title: "Inbox" };

const kindLabels: Record<MessageKind, string> = { tip: "News tips", contact: "Contact", advertise: "Advertising" };

/** mailto:, tel: or WhatsApp link for the reply address the reader gave. */
function ReplyLinks({ replyTo }: { replyTo: string }) {
  const link = "font-semibold text-lake-ink hover:underline";
  if (replyTo.includes("@")) return <a href={`mailto:${replyTo}`} className={link}>{replyTo}</a>;
  const digits = replyTo.replace(/[^\d+]/g, "");
  const whatsapp = digits.replace(/^\+/, "").replace(/^0/, "256");
  return (
    <span className="flex flex-wrap gap-x-3">
      <a href={`tel:${digits}`} className={link}>{replyTo}</a>
      <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className={link}>WhatsApp ↗</a>
    </span>
  );
}

export default async function InboxPage({ searchParams }: PageProps<"/newsroom/inbox">) {
  await requireStaff("inbox.read");
  const sp = await searchParams;
  const kind: MessageKind = (MESSAGE_KINDS as readonly string[]).includes(String(sp.kind)) ? (sp.kind as MessageKind) : "tip";
  const archived = sp.view === "archived";
  const db = getDb();

  // Keep the minimum (privacy policy): nothing is kept longer than 12 months.
  await pruneOldMessages();

  const [messages, newCounts] = await Promise.all([
    db
      .select()
      .from(readerMessage)
      .where(and(eq(readerMessage.kind, kind), archived ? eq(readerMessage.status, "archived") : ne(readerMessage.status, "archived")))
      .orderBy(desc(readerMessage.createdAt))
      .limit(100),
    db.select({ kind: readerMessage.kind, n: count() }).from(readerMessage).where(eq(readerMessage.status, "new")).groupBy(readerMessage.kind),
  ]);
  const newOf = (k: MessageKind) => newCounts.find((c) => c.kind === k)?.n ?? 0;

  return (
    <>
      <h1 className="font-serif text-3xl font-bold text-ink">Inbox</h1>
      <p className="mt-1 max-w-3xl text-slate">
        Messages from readers. Tips can come from people who must stay anonymous: never share them outside the editors, and delete
        them once the story is checked. Messages are deleted automatically after 12 months.
      </p>

      <nav aria-label="Message types" className="mt-6 flex flex-wrap gap-2 border-b border-mist pb-3">
        {MESSAGE_KINDS.map((k) => (
          <Link
            key={k}
            href={`/newsroom/inbox?kind=${k}`}
            aria-current={k === kind ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold ${k === kind ? "bg-brand text-white" : "text-ink hover:bg-mist"}`}
          >
            {kindLabels[k]}
            {newOf(k) > 0 && <span className="rounded-full bg-accent px-1.5 text-xs font-bold text-brand-deep">{newOf(k)}</span>}
          </Link>
        ))}
        <Link
          href={archived ? `/newsroom/inbox?kind=${kind}` : `/newsroom/inbox?kind=${kind}&view=archived`}
          className="ml-auto rounded-md px-3 py-1.5 text-sm font-semibold text-lake-ink hover:bg-mist"
        >
          {archived ? "← Back to inbox" : "Archived"}
        </Link>
      </nav>

      {messages.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-mist p-8 text-center text-slate">
          {archived ? "No archived messages." : `No ${kindLabels[kind].toLowerCase()} right now.`}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {messages.map((m) => (
            <li key={m.id} className={`rounded-lg border bg-surface p-4 ${m.status === "new" ? "border-l-4 border-l-crane-gold border-mist" : "border-mist"}`}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {m.status === "new" && <span className="rounded bg-crane-gold/25 px-1.5 text-xs font-bold text-ink">NEW</span>}
                <span className="font-semibold text-ink">{m.name ?? (m.kind === "tip" ? "Anonymous" : "No name given")}</span>
                {m.replyTo ? <ReplyLinks replyTo={m.replyTo} /> : <span className="text-sm text-slate">No contact given</span>}
                <time dateTime={m.createdAt.toISOString()} className="ml-auto text-sm text-slate">{formatEAT(m.createdAt)}</time>
              </div>
              {m.subject && <p className="mt-2 font-semibold text-ink">{m.subject}</p>}
              <p className="mt-2 whitespace-pre-wrap break-words text-ink">{m.body}</p>
              <div className="mt-3">
                <MessageControls id={m.id} status={m.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
