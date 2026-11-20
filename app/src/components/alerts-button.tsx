"use client";

import { useEffect, useState } from "react";

// Shown only when reader sign-ups are switched on and the VAPID key is set (D-044).
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const ENABLED = process.env.NEXT_PUBLIC_READER_SIGNUPS === "on" && PUBLIC_KEY !== "";

type Status = "checking" | "off" | "on" | "blocked" | "unsupported" | "ios-install";

function keyBytes(base64url: string) {
  const b64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function detect(): Status {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    // iPhones get alerts only from the Home Screen app (iOS 16.4 and later).
    return ios && !standalone ? "ios-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "blocked";
  return "off";
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration("/");
  return reg ? reg.pushManager.getSubscription() : null;
}

export function AlertsButton({ className = "" }: { className?: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ENABLED) return;
    let cancelled = false;
    const first = detect();
    const check = first === "off" ? currentSubscription().then((s) => (s ? "on" : "off")).catch(() => "off" as const) : Promise.resolve(first);
    check.then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ENABLED || status === "checking") return null;

  async function turnOn() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) }));
      const res = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Alerts could not be turned on. Try again.");
      }
      setStatus("on");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Alerts could not be turned on. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setError(null);
    try {
      const sub = await currentSubscription();
      if (sub) {
        await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch {
      setError("Alerts could not be turned off. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const button = "inline-flex items-center gap-2 rounded-md border border-current px-3 py-2 text-sm font-semibold hover:opacity-80 disabled:opacity-60";
  return (
    <div className={className}>
      {status === "off" && (
        <button type="button" onClick={turnOn} disabled={busy} className={button}>
          <BellIcon /> {busy ? "Turning on…" : "Get breaking-news alerts"}
        </button>
      )}
      {status === "on" && (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <BellIcon /> Breaking-news alerts are on.
          <button type="button" onClick={turnOff} disabled={busy} className="font-semibold underline">
            {busy ? "Turning off…" : "Turn off"}
          </button>
        </p>
      )}
      {status === "blocked" && <p className="text-sm">Alerts are blocked for this site. To get them, allow notifications in your browser&apos;s site settings.</p>}
      {status === "ios-install" && (
        <p className="text-sm">On iPhone: tap Share, then &ldquo;Add to Home Screen&rdquo;. Open BX News from the Home Screen to turn on breaking-news alerts.</p>
      )}
      {error && <p role="alert" className="mt-1 text-sm font-semibold">{error}</p>}
      {(status === "off" || status === "on") && <p className="mt-1 text-xs opacity-80">Only for big breaking news, a few times a week at most. We keep no name, email or phone number.</p>}
    </div>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
