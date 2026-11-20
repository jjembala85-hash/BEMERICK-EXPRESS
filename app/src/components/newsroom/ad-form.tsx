"use client";

import { useActionState } from "react";
import { createAd, setAdStatus, updateAd, type AdFormState } from "@/app/newsroom/(protected)/ads/actions";
import { submitWithoutReset } from "@/lib/forms";
import { AD_SLOTS, type AdSlot } from "@/lib/ads";
import { LeadPhoto, type LeadPhotoValue } from "./lead-photo";

export type AdValues = {
  id: string;
  advertiser: string;
  campaign: string;
  linkUrl: string;
  slots: AdSlot[];
  startsAt: string; // datetime-local, EAT
  endsAt: string;
  photo: LeadPhotoValue | null;
};

const inputClass =
  "w-full rounded-md border border-mist bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20";
const labelClass = "mb-1 block text-sm font-semibold text-ink";
const quiet = "rounded-md border border-mist px-3 py-1.5 text-sm font-semibold text-ink hover:bg-mist disabled:opacity-60";

function Notice({ state }: { state: AdFormState }) {
  if (state.error) return <p role="alert" className="rounded-md bg-ember/10 px-3 py-2 text-sm font-semibold text-ember">{state.error}</p>;
  if (state.message) return <p role="status" className="rounded-md bg-mist px-3 py-2 text-sm font-semibold text-lake-ink">{state.message}</p>;
  return null;
}

export function AdForm({ values, storageReady }: { values?: AdValues; storageReady: boolean }) {
  const [state, action, pending] = useActionState<AdFormState, FormData>(values ? updateAd : createAd, {});
  return (
    <form onSubmit={submitWithoutReset(action)} className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        {values && <input type="hidden" name="adId" value={values.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="advertiser" className={labelClass}>Advertiser</label>
            <input id="advertiser" name="advertiser" required maxLength={80} defaultValue={values?.advertiser} placeholder="e.g. Kampala Motors" className={inputClass} />
          </div>
          <div>
            <label htmlFor="campaign" className={labelClass}>Campaign</label>
            <input id="campaign" name="campaign" required maxLength={80} defaultValue={values?.campaign} placeholder="e.g. December sale" className={inputClass} />
          </div>
        </div>
        <div>
          <label htmlFor="linkUrl" className={labelClass}>Advertiser&apos;s web address</label>
          <input id="linkUrl" name="linkUrl" required inputMode="url" defaultValue={values?.linkUrl} placeholder="https://…" className={inputClass} />
          <p className="mt-1 text-xs text-slate">Where readers go when they tap the banner. Must start with https://.</p>
        </div>
        <fieldset>
          <legend className={labelClass}>Where it appears</legend>
          <div className="space-y-1.5">
            {(Object.keys(AD_SLOTS) as AdSlot[]).map((slot) => (
              <label key={slot} className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" name="slots" value={slot} defaultChecked={values?.slots.includes(slot)} className="size-4 accent-lake-ink" />
                {AD_SLOTS[slot].label}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate">When several ads share a place, they take turns, changing every minute.</p>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="startsAt" className={labelClass}>Starts (EAT)</label>
            <input id="startsAt" name="startsAt" type="datetime-local" defaultValue={values?.startsAt} className={inputClass} />
            <p className="mt-1 text-xs text-slate">Leave empty to start now.</p>
          </div>
          <div>
            <label htmlFor="endsAt" className={labelClass}>Ends (EAT)</label>
            <input id="endsAt" name="endsAt" type="datetime-local" defaultValue={values?.endsAt} className={inputClass} />
            <p className="mt-1 text-xs text-slate">Leave empty to run until you pause it.</p>
          </div>
        </div>
        <Notice state={state} />
        <button type="submit" disabled={pending} className="rounded-md bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-deep disabled:opacity-60">
          {pending ? "Saving…" : values ? "Save ad" : "Add ad"}
        </button>
      </div>
      <div>
        <LeadPhoto
          initial={values?.photo}
          storageReady={storageReady}
          fieldName="mediaId"
          label="Banner image"
          hint="A wide banner, 1200 × 300 pixels (4:1), works in every place. Put the advertiser's name in the alt text."
          saveHint="Save the ad to keep image changes."
        />
      </div>
    </form>
  );
}

export function AdStatusButton({ id, to, label, confirm, danger }: { id: string; to: "pause" | "resume" | "delete"; label: string; confirm?: string; danger?: boolean }) {
  const [state, action, pending] = useActionState<AdFormState, FormData>(setAdStatus, {});
  return (
    <form
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) {
          e.preventDefault();
          return;
        }
        submitWithoutReset(action)(e);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="adId" value={id} />
      <input type="hidden" name="to" value={to} />
      <button type="submit" disabled={pending} className={`${quiet} ${danger ? "border-ember text-ember" : ""}`}>{pending ? "Working…" : label}</button>
      {state.error && <span role="alert" className="text-sm font-semibold text-ember">{state.error}</span>}
    </form>
  );
}
