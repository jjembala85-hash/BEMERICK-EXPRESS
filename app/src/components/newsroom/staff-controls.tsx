"use client";

import { useActionState, useState } from "react";
import {
  changeStaffRole,
  inviteStaff,
  newStaffLink,
  setStaffActive,
  type InviteState,
  type StaffActionState,
} from "@/app/newsroom/(protected)/staff/actions";
import { ROLES, roleLabels, type Role } from "@/lib/permissions";
import { submitWithoutReset } from "@/lib/forms";

const inputClass =
  "w-full rounded-md border border-mist bg-surface px-3 py-2.5 text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20";
const labelClass = "mb-1 block text-sm font-semibold text-ink";
const smallButton =
  "rounded-md border border-mist px-3 py-1.5 text-sm font-semibold text-ink hover:bg-mist disabled:opacity-60";

/** Shows an invite link once, with WhatsApp and copy buttons. */
function LinkBox({ name, link }: { name: string; link: string }) {
  const [copied, setCopied] = useState(false);
  const message = `Hello ${name.split(" ")[0]}, you have been added to the BX News newsroom. Open this link to set your password (it works once and expires in 7 days): ${link}`;
  return (
    <div role="status" className="mt-4 rounded-lg border-l-4 border-lake-ink bg-mist/60 p-4">
      <p className="font-semibold text-ink">Send this link to {name}</p>
      <p className="mt-1 text-sm text-slate">
        It works once and expires in 7 days. Anyone with the link can set the password, so send it only to them.
      </p>
      <input readOnly value={link} onFocus={(e) => e.target.select()} className={`${inputClass} mt-3 text-sm`} aria-label="Invite link" />
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
        >
          Send on WhatsApp
        </a>
        <button
          type="button"
          className={smallButton}
          onClick={async () => {
            await navigator.clipboard.writeText(message).catch(() => {});
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy message"}
        </button>
      </div>
    </div>
  );
}

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteStaff, {});
  return (
    <div>
      <form onSubmit={submitWithoutReset(action)} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="inv-name" className={labelClass}>Full name</label>
          <input id="inv-name" name="name" required maxLength={80} className={inputClass} />
        </div>
        <div>
          <label htmlFor="inv-email" className={labelClass}>Email</label>
          <input id="inv-email" name="email" type="email" required maxLength={200} className={inputClass} />
        </div>
        <div>
          <label htmlFor="inv-role" className={labelClass}>Role</label>
          <select id="inv-role" name="role" defaultValue="writer" className={inputClass}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{roleLabels[r]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="inv-title" className={labelClass}>Job title (shown on bylines)</label>
          <input id="inv-title" name="jobTitle" maxLength={80} placeholder="e.g. Reporter" className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          {state.error && (
            <p role="alert" className="mb-3 rounded-md bg-ember/10 px-3 py-2 text-sm font-semibold text-ember">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
          >
            {pending ? "Adding…" : "Add and create invite link"}
          </button>
        </div>
      </form>
      {state.link && state.name && <LinkBox name={state.name} link={state.link} />}
    </div>
  );
}

export function StaffRowControls({
  userId,
  name,
  role,
  active,
}: {
  userId: string;
  name: string;
  role: Role;
  active: boolean;
}) {
  const [linkState, linkAction, linkPending] = useActionState<StaffActionState, FormData>(newStaffLink, {});
  const [roleState, roleAction, rolePending] = useActionState<StaffActionState, FormData>(changeStaffRole, {});
  const [activeState, activeAction, activePending] = useActionState<StaffActionState, FormData>(setStaffActive, {});
  const error = linkState.error ?? roleState.error ?? activeState.error;

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={submitWithoutReset(roleAction)} className="flex items-center gap-1.5">
          <input type="hidden" name="userId" value={userId} />
          <label htmlFor={`role-${userId}`} className="sr-only">Role for {name}</label>
          <select
            id={`role-${userId}`}
            name="role"
            defaultValue={role}
            disabled={rolePending}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="rounded-md border border-mist bg-surface px-2 py-1.5 text-sm text-ink"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{roleLabels[r]}</option>
            ))}
          </select>
        </form>
        <form onSubmit={submitWithoutReset(linkAction)}>
          <input type="hidden" name="userId" value={userId} />
          <button type="submit" disabled={linkPending} className={smallButton}>
            {linkPending ? "Making…" : "New link"}
          </button>
        </form>
        <form
          
            onSubmit={(e) => {
              if (active && !window.confirm(`Deactivate ${name}? They will be signed out and unable to sign in.`)) {
                e.preventDefault();
                return;
              }
              submitWithoutReset(activeAction)(e);
            }}
        >
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="active" value={active ? "false" : "true"} />
          <button
            type="submit"
            disabled={activePending}
            className={active ? `${smallButton} text-ember` : smallButton}
          >
            {active ? "Deactivate" : "Reactivate"}
          </button>
        </form>
      </div>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-ember">{error}</p>}
      {linkState.link && linkState.name && <LinkBox name={linkState.name} link={linkState.link} />}
    </div>
  );
}
