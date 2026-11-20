import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/session";
import { isStorageReady } from "@/lib/media";
import { adDailyStats, getAdForEditing } from "@/lib/queries/ads";
import { adState, adStateLabels, ctr } from "@/lib/ads";
import { toEATInput } from "@/lib/workflow";
import { AdForm, AdStatusButton } from "@/components/newsroom/ad-form";

export const metadata: Metadata = { title: "Edit ad" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const doneMessages: Record<string, string> = {
  created: "Ad added. It appears on the site from its start time.",
  paused: "Ad paused. Readers no longer see it.",
  resumed: "Ad running again.",
};

export default async function AdPage({ params, searchParams }: PageProps<"/newsroom/ads/[id]">) {
  await requireStaff("ads.manage");
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [ad, days] = await Promise.all([getAdForEditing(id), adDailyStats(id)]);
  if (!ad) notFound();
  const done = (await searchParams).done;
  const flash = typeof done === "string" ? doneMessages[done] : undefined;
  const state = adState(ad, new Date());
  const total = days.reduce((t, d) => ({ views: t.views + d.views, clicks: t.clicks + d.clicks }), { views: 0, clicks: 0 });

  return (
    <>
      <p className="text-sm"><Link href="/newsroom/ads" className="font-semibold text-lake-ink hover:underline">← All ads</Link></p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-3xl font-bold text-ink">{ad.advertiser}</h1>
        <span className="text-lg text-slate">{ad.campaign}</span>
        <span className="rounded bg-mist px-2 py-0.5 text-xs font-bold tracking-wider text-ink">{adStateLabels[state].toUpperCase()}</span>
        <span className="ml-auto flex flex-wrap gap-2">
          {state !== "ended" &&
            (ad.paused ? (
              <AdStatusButton id={ad.id} to="resume" label="Resume" />
            ) : (
              <AdStatusButton id={ad.id} to="pause" label="Pause" confirm="Pause this ad? Readers stop seeing it straight away." />
            ))}
          <AdStatusButton id={ad.id} to="delete" label="Delete" danger confirm="Delete this ad and its view and click numbers? This cannot be undone." />
        </span>
      </div>
      {flash && <p role="status" className="mt-4 rounded-md bg-mist px-3 py-2 font-semibold text-lake-ink">{flash}</p>}

      <section className="mt-6 rounded-lg border border-mist bg-surface p-5">
        <AdForm
          storageReady={isStorageReady()}
          values={{
            id: ad.id,
            advertiser: ad.advertiser,
            campaign: ad.campaign,
            linkUrl: ad.linkUrl,
            slots: ad.slots,
            startsAt: toEATInput(ad.startsAt),
            endsAt: ad.endsAt ? toEATInput(ad.endsAt) : "",
            photo: ad.photo,
          }}
        />
      </section>

      <section aria-labelledby="report" className="mt-8">
        <h2 id="report" className="font-serif text-xl font-bold text-ink">Report: last 90 days</h2>
        <p className="mt-1 text-sm text-slate">
          A view is counted when at least half the banner has been on screen for one second. Search engines and other robots are not counted.
        </p>
        {days.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-mist p-4 text-slate">No views yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[24rem] text-left text-sm">
              <thead className="border-b border-mist text-slate">
                <tr>
                  <th className="py-2 pr-4 font-semibold">Day</th>
                  <th className="py-2 pr-4 text-right font-semibold">Views</th>
                  <th className="py-2 pr-4 text-right font-semibold">Clicks</th>
                  <th className="py-2 text-right font-semibold">Click rate</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b-2 border-mist font-semibold text-ink">
                  <td className="py-2 pr-4">Total</td>
                  <td className="py-2 pr-4 text-right">{total.views.toLocaleString("en-GB")}</td>
                  <td className="py-2 pr-4 text-right">{total.clicks.toLocaleString("en-GB")}</td>
                  <td className="py-2 text-right">{ctr(total.views, total.clicks)}</td>
                </tr>
                {days.map((d) => (
                  <tr key={d.day} className="border-b border-mist text-ink">
                    <td className="py-1.5 pr-4">{new Date(`${d.day}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="py-1.5 pr-4 text-right">{d.views.toLocaleString("en-GB")}</td>
                    <td className="py-1.5 pr-4 text-right">{d.clicks.toLocaleString("en-GB")}</td>
                    <td className="py-1.5 text-right">{ctr(d.views, d.clicks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
