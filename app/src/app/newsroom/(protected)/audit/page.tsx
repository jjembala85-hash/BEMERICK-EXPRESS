import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/session";
import { formatEAT } from "@/lib/dates";
import { AUDIT_AREAS, describeAction, detailPairs, isAuditArea, isSensitive } from "@/lib/audit";
import { AUDIT_PAGE_SIZE, auditPeople, eatDayStart, getAuditEntries, type AuditEntry } from "@/lib/queries/audit";

export const metadata: Metadata = { title: "History" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fieldClass =
  "w-full rounded-md border border-mist bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20";
const labelClass = "mb-1 block text-xs font-semibold text-slate";

/** What the entry was about, with a link when the thing still exists. */
function Subject({ entry }: { entry: AuditEntry }) {
  const link = "font-semibold text-lake-ink hover:underline";
  switch (entry.entity) {
    case "article":
      return entry.headline ? (
        <Link href={`/newsroom/stories/${entry.entityId}`} className={link}>{entry.headline}</Link>
      ) : (
        <span className="text-slate">(story since deleted)</span>
      );
    case "media":
      return entry.photoCredit ? (
        <Link href={`/newsroom/media/${entry.entityId}`} className={link}>Photo by {entry.photoCredit}</Link>
      ) : (
        <span className="text-slate">(photo since deleted)</span>
      );
    case "tag":
      return entry.tagName ? (
        <Link href={`/newsroom/tags?q=${encodeURIComponent(entry.tagName)}`} className={link}>{entry.tagName}</Link>
      ) : (
        <span className="text-slate">(tag since removed)</span>
      );
    case "user":
      return entry.personName ? (
        <Link href={`/newsroom/staff/${entry.entityId}`} className={link}>{entry.personName}</Link>
      ) : null;
    case "live_stream":
      return <Link href="/newsroom/live" className={link}>Live streams</Link>;
    case "homepage":
    case "breaking_alert":
      return <Link href="/newsroom/homepage" className={link}>Homepage board</Link>;
    default:
      return null;
  }
}

export default async function AuditPage({ searchParams }: PageProps<"/newsroom/audit">) {
  await requireStaff("audit.view");
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const area = isAuditArea(sp.area) ? sp.area : undefined;
  const actorId = /^[A-Za-z0-9_-]{1,64}$/.test(str(sp.person)) ? str(sp.person) : undefined;
  const articleId = UUID.test(str(sp.story)) ? str(sp.story) : undefined;
  const fromDay = str(sp.from);
  const toDay = str(sp.to);
  const from = eatDayStart(fromDay) ?? undefined;
  const toStart = eatDayStart(toDay);
  const before = toStart ? new Date(toStart.getTime() + 24 * 60 * 60 * 1000) : undefined;
  const page = Math.min(1000, Math.max(1, Number.parseInt(str(sp.page) || "1", 10) || 1));

  const [{ entries, hasMore }, people] = await Promise.all([
    getAuditEntries({ area, actorId, articleId, from, before, page }),
    auditPeople(),
  ]);
  const storyTitle = articleId ? (entries.find((e) => e.headline)?.headline ?? "this story") : null;

  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ area: area ?? "", person: actorId ?? "", story: articleId ?? "", from: fromDay, to: toDay })) {
      if (v) params.set(k, v);
    }
    if (n > 1) params.set("page", String(n));
    const s = params.toString();
    return `/newsroom/audit${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <h1 className="font-serif text-3xl font-bold text-ink">History</h1>
      <p className="mt-1 max-w-3xl text-slate">
        Every important change in the newsroom: who did it and when. Entries cannot be edited or deleted. Times are East
        Africa Time.
      </p>

      {articleId ? (
        <p className="mt-6 rounded-md bg-mist px-3 py-2 text-sm text-ink">
          Showing the history of <span className="font-semibold">{storyTitle}</span>.{" "}
          <Link href="/newsroom/audit" className="font-semibold text-lake-ink hover:underline">Show everything</Link>
        </p>
      ) : (
        <form action="/newsroom/audit" className="mt-6 grid gap-3 rounded-lg border border-mist bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_10rem_10rem_auto]">
          <div>
            <label htmlFor="area" className={labelClass}>Area</label>
            <select id="area" name="area" defaultValue={area ?? ""} className={fieldClass}>
              <option value="">Everything</option>
              {Object.entries(AUDIT_AREAS).map(([key, a]) => (
                <option key={key} value={key}>{a.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="person" className={labelClass}>Person</label>
            <select id="person" name="person" defaultValue={actorId ?? ""} className={fieldClass}>
              <option value="">Anyone</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="from" className={labelClass}>From</label>
            <input id="from" name="from" type="date" defaultValue={fromDay} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="to" className={labelClass}>To</label>
            <input id="to" name="to" type="date" defaultValue={toDay} className={fieldClass} />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep">Show</button>
            <Link href="/newsroom/audit" className="rounded-md border border-mist px-3 py-2 text-sm font-semibold text-ink hover:bg-mist">Clear</Link>
          </div>
        </form>
      )}

      {entries.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-mist p-8 text-center text-slate">Nothing recorded for these filters.</p>
      ) : (
        <ol className="mt-6 divide-y divide-mist rounded-lg border border-mist bg-surface">
          {entries.map((e) => {
            const pairs = detailPairs(e.details);
            return (
              <li key={e.id} className={`px-4 py-3 ${isSensitive(e.action) ? "border-l-4 border-l-crane-gold" : ""}`}>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-semibold text-ink">{e.actorName ?? "System"}</span>
                  <span className="text-ink">{describeAction(e.action)}</span>
                  <Subject entry={e} />
                  <time dateTime={e.createdAt.toISOString()} className="ml-auto whitespace-nowrap text-sm text-slate">
                    {formatEAT(e.createdAt)}
                  </time>
                </div>
                {pairs.length > 0 && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs font-semibold text-slate hover:text-ink">Details</summary>
                    <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
                      {pairs.map(([k, v], i) => (
                        <div key={i} className="contents">
                          <dt className="text-slate">{k}</dt>
                          <dd className="break-words text-ink">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {(page > 1 || hasMore) && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between">
          {page > 1 ? <Link href={pageHref(page - 1)} className="font-semibold text-lake-ink hover:underline">← Newer</Link> : <span />}
          <span className="text-sm text-slate">Page {page} · {AUDIT_PAGE_SIZE} per page</span>
          {hasMore ? <Link href={pageHref(page + 1)} className="font-semibold text-lake-ink hover:underline">Older →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
