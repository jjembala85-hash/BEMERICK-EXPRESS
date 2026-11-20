import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/session";
import { isStorageReady } from "@/lib/media";
import { listAds } from "@/lib/queries/ads";
import { AD_SLOTS, adState, adStateLabels, ctr, type AdState } from "@/lib/ads";
import { formatEAT } from "@/lib/dates";
import { AdForm } from "@/components/newsroom/ad-form";

export const metadata: Metadata = { title: "Ads" };

const stateClass: Record<AdState, string> = {
  running: "bg-lake-ink text-white",
  scheduled: "bg-crane-gold/25 text-ink",
  paused: "bg-mist text-ink",
  ended: "bg-mist text-slate",
};

export default async function AdsPage({ searchParams }: PageProps<"/newsroom/ads">) {
  await requireStaff("ads.manage");
  const done = (await searchParams).done;
  const ads = await listAds();
  const now = new Date();

  return (
    <>
      <h1 className="font-serif text-3xl font-bold text-ink">Ads</h1>
      <p className="mt-1 max-w-3xl text-slate">
        Banners sold directly to advertisers. Each one is labelled &ldquo;Advertisement&rdquo; and kept apart from the stories. Views and clicks are
        counted per day, without storing anything about readers, so you can send advertisers a report.
      </p>
      {done === "deleted" && <p role="status" className="mt-4 rounded-md bg-mist px-3 py-2 font-semibold text-lake-ink">Ad deleted.</p>}

      <section className="mt-6">
        {ads.length === 0 ? (
          <p className="rounded-lg border border-dashed border-mist p-4 text-slate">No ads yet. Add the first one below.</p>
        ) : (
          <ul className="space-y-3">
            {ads.map((a) => {
              const state = adState(a, now);
              return (
                <li key={a.id}>
                  <Link href={`/newsroom/ads/${a.id}`} className="flex flex-wrap items-center gap-4 rounded-lg border border-mist bg-surface p-3 hover:border-lake-ink">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.thumb} alt="" className="h-12 w-48 shrink-0 rounded bg-mist object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-bold tracking-wider ${stateClass[state]}`}>{adStateLabels[state].toUpperCase()}</span>
                        <span className="font-semibold text-ink">{a.advertiser}</span>
                        <span className="text-slate">· {a.campaign}</span>
                      </span>
                      <span className="mt-1 block text-sm text-slate">
                        {a.slots.map((s) => AD_SLOTS[s].label.split(",")[0]).filter((v, i, all) => all.indexOf(v) === i).join(", ")} ·{" "}
                        {formatEAT(a.startsAt)}
                        {a.endsAt ? ` to ${formatEAT(a.endsAt)}` : ", no end date"}
                      </span>
                    </span>
                    <span className="text-right text-sm text-ink">
                      <span className="block"><strong>{a.views30.toLocaleString("en-GB")}</strong> views · <strong>{a.clicks30.toLocaleString("en-GB")}</strong> clicks</span>
                      <span className="block text-slate">last 30 days · {ctr(a.views30, a.clicks30)} click rate</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-lg border border-mist bg-surface p-5">
        <h2 className="mb-4 font-serif text-xl font-bold text-ink">Add an ad</h2>
        <AdForm storageReady={isStorageReady()} />
      </section>
    </>
  );
}
