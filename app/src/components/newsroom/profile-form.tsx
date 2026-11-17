"use client";

import { useActionState } from "react";
import { saveProfile, type ProfileState } from "@/app/newsroom/(protected)/profile/actions";
import { submitWithoutReset } from "@/lib/forms";
import { LeadPhoto, type LeadPhotoValue } from "./lead-photo";

const inputClass =
  "w-full rounded-md border border-mist bg-surface px-3 py-2.5 text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20";
const labelClass = "mb-1 block text-sm font-semibold text-ink";

export type ProfileValues = {
  userId: string;
  displayName: string;
  slug: string;
  jobTitle: string;
  bio: string;
  xHandle: string;
  isPublic: boolean;
  photo: LeadPhotoValue | null;
};

export function ProfileForm({ values, storageReady }: { values: ProfileValues; storageReady: boolean }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, {});
  return (
    <form onSubmit={submitWithoutReset(action)} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <input type="hidden" name="userId" value={values.userId} />
      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="displayName" className={labelClass}>Name on bylines</label>
            <input id="displayName" name="displayName" required maxLength={80} defaultValue={values.displayName} className={inputClass} />
          </div>
          <div>
            <label htmlFor="jobTitle" className={labelClass}>Job title</label>
            <input id="jobTitle" name="jobTitle" maxLength={80} defaultValue={values.jobTitle} placeholder="e.g. Business Reporter" className={inputClass} />
          </div>
        </div>
        <div>
          <label htmlFor="bio" className={labelClass}>Bio</label>
          <textarea
            id="bio"
            name="bio"
            rows={6}
            maxLength={1000}
            defaultValue={values.bio}
            placeholder="Two or three sentences: what you cover, where you are based, how readers can reach you with tips."
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate">Plain text. Leave a blank line between paragraphs. Do not include a phone number or home area.</p>
        </div>
        <div className="sm:max-w-xs">
          <label htmlFor="xHandle" className={labelClass}>X (Twitter) handle (optional)</label>
          <input id="xHandle" name="xHandle" maxLength={60} defaultValue={values.xHandle ? `@${values.xHandle}` : ""} placeholder="@name" className={inputClass} />
        </div>

        <fieldset className="rounded-lg border border-mist bg-surface p-4">
          <legend className="px-1 text-sm font-semibold text-ink">Public author page</legend>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="isPublic" defaultChecked={values.isPublic} className="mt-1 size-4 accent-lake-ink" />
            <span className="text-sm text-ink">
              Show an author page at <span className="font-semibold">/author/{values.slug}</span> with this photo, bio and
              published stories, and link bylines to it.
              <span className="mt-1 block text-slate">
                Leave this off if being publicly identified could put you at risk. Bylines then show your name only.
              </span>
            </span>
          </label>
        </fieldset>

        {state.error && <p role="alert" className="rounded-md bg-ember/10 px-3 py-2 text-sm font-semibold text-ember">{state.error}</p>}
        {state.message && <p role="status" className="rounded-md bg-mist px-3 py-2 text-sm font-semibold text-lake-ink">{state.message}</p>}
        <button type="submit" disabled={pending} className="rounded-md bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-deep disabled:opacity-60">
          {pending ? "Saving…" : "Save profile"}
        </button>
      </div>

      <div>
        <LeadPhoto
          initial={values.photo}
          storageReady={storageReady}
          fieldName="photoMediaId"
          label="Profile photo"
          hint="A head-and-shoulders photo works best. The top of the photo is kept when it is cropped."
          saveHint="Save the profile to keep photo changes."
          portrait
        />
      </div>
    </form>
  );
}
