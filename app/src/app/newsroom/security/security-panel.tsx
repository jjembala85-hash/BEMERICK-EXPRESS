"use client";

import { useActionState, useState } from "react";
import { confirmSetup, newBackupCodes, startSetup, turnOff, type CodesState, type SetupState } from "./actions";
import { submitWithoutReset } from "@/lib/forms";

const inputClass =
  "w-full rounded-md border border-mist bg-surface px-3 py-2.5 text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20";
const labelClass = "mb-1 block text-sm font-semibold text-ink";
const primary = "rounded-md bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-deep disabled:opacity-60";
const quiet = "rounded-md border border-mist px-4 py-2 text-sm font-semibold text-ink hover:bg-mist disabled:opacity-60";

function Alert({ text }: { text?: string }) {
  return text ? <p role="alert" className="rounded-md bg-ember/10 px-3 py-2 text-sm font-semibold text-ember">{text}</p> : null;
}

function PasswordField({ id }: { id: string }) {
  return (
    <div className="max-w-sm">
      <label htmlFor={id} className={labelClass}>Your password</label>
      <input id={id} name="password" type="password" autoComplete="current-password" required className={inputClass} />
    </div>
  );
}

/** Backup codes with copy and download, shown once. */
function BackupCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);
  const text = `BX Newsroom backup codes (each works once)\n\n${codes.join("\n")}\n`;
  return (
    <div className="rounded-lg border-l-4 border-crane-gold bg-paper p-4">
      <p className="font-semibold text-ink">Backup codes</p>
      <p className="mt-1 text-sm text-slate">
        If you lose your phone, each of these lets you sign in once. Save them somewhere safe that is not your phone (for
        example print them, or keep them in a password manager). They are shown only now.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm text-ink sm:grid-cols-5" aria-label="Backup codes">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={quiet}
          onClick={async () => {
            await navigator.clipboard.writeText(text).catch(() => {});
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy codes"}
        </button>
        <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`} download="bx-newsroom-backup-codes.txt" className={quiet}>
          Download as a file
        </a>
      </div>
    </div>
  );
}

export function SetupFlow() {
  const [started, startAction, starting] = useActionState<SetupState, FormData>(startSetup, {});
  const [confirm, confirmAction, confirming] = useActionState<SetupState, FormData>(confirmSetup, {});

  if (!started.qrSvg) {
    return (
      <form onSubmit={submitWithoutReset(startAction)} className="space-y-4">
        <ol className="list-decimal space-y-1 pl-5 text-ink">
          <li>
            Install a free authenticator app on your phone: <span className="font-semibold">Google Authenticator</span> or{" "}
            <span className="font-semibold">Microsoft Authenticator</span> (Play Store or App Store).
          </li>
          <li>Type your password below to get your QR code.</li>
        </ol>
        <PasswordField id="setup-password" />
        <Alert text={started.error} />
        <button type="submit" disabled={starting} className={primary}>{starting ? "Starting…" : "Get my QR code"}</button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {/* Always dark on white, so phones can scan it in dark mode too. */}
        <div
          role="img"
          aria-label="QR code to add BX Newsroom to your authenticator app"
          className="w-48 shrink-0 rounded-lg bg-white p-2"
          // The SVG is made on our server by the qrcode library from the app's own setup link.
          dangerouslySetInnerHTML={{ __html: started.qrSvg }}
        />
        <div className="space-y-2 text-ink">
          <p>
            In the app, tap <span className="font-semibold">+</span>, then <span className="font-semibold">Scan a QR code</span>, and
            point the camera at this code.
          </p>
          <p className="text-sm text-slate">Can&apos;t scan? Choose &ldquo;Enter a setup key&rdquo; and type this key:</p>
          <p className="select-all break-all rounded-md bg-mist px-3 py-2 font-mono text-sm" data-testid="setup-key">{started.key}</p>
        </div>
      </div>

      {started.backupCodes && started.backupCodes.length > 0 && <BackupCodes codes={started.backupCodes} />}

      <form onSubmit={submitWithoutReset(confirmAction)} className="space-y-3">
        <div className="max-w-xs">
          <label htmlFor="setup-code" className={labelClass}>Code shown in the app</label>
          <input
            id="setup-code"
            name="code"
            required
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={9}
            placeholder="123 456"
            className={`${inputClass} text-center font-mono text-2xl tracking-[0.3em]`}
          />
        </div>
        <Alert text={confirm.error} />
        <button type="submit" disabled={confirming} className={primary}>{confirming ? "Checking…" : "Turn on two-step sign-in"}</button>
      </form>
    </div>
  );
}

export function ManageTwoFactor({ canTurnOff }: { canTurnOff: boolean }) {
  const [codes, codesAction, making] = useActionState<CodesState, FormData>(newBackupCodes, {});
  const [off, offAction, turningOff] = useActionState<CodesState, FormData>(turnOff, {});
  return (
    <div className="space-y-8">
      <form onSubmit={submitWithoutReset(codesAction)} className="space-y-3">
        <h2 className="font-serif text-xl font-bold text-ink">New backup codes</h2>
        <p className="text-sm text-slate">Used some, or lost the list? Making new codes cancels all the old ones.</p>
        {codes.backupCodes ? (
          <BackupCodes codes={codes.backupCodes} />
        ) : (
          <>
            <PasswordField id="codes-password" />
            <Alert text={codes.error} />
            <button type="submit" disabled={making} className={quiet}>{making ? "Making…" : "Make new backup codes"}</button>
          </>
        )}
      </form>
      {canTurnOff && (
        <form
          onSubmit={(e) => {
            if (!window.confirm("Turn off two-step sign-in? Your account will be protected by the password only.")) {
              e.preventDefault();
              return;
            }
            submitWithoutReset(offAction)(e);
          }}
          className="space-y-3"
        >
          <h2 className="font-serif text-xl font-bold text-ink">Turn off</h2>
          <PasswordField id="off-password" />
          <Alert text={off.error} />
          <button type="submit" disabled={turningOff} className={`${quiet} border-ember text-ember`}>
            {turningOff ? "Turning off…" : "Turn off two-step sign-in"}
          </button>
        </form>
      )}
    </div>
  );
}
