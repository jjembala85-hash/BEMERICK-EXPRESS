// Server error reporting to Sentry (D-041) without the Sentry SDK, so readers
// download no extra JavaScript. Active only when SENTRY_DSN is set. Privacy: no
// cookies, headers, IP addresses or form data are sent, only the error, the
// page path and which route failed.

export type Dsn = { endpoint: string; publicKey: string };

/** https://<key>@o123.ingest.de.sentry.io/456 -> envelope endpoint and key. Null if not a Sentry DSN. */
export function parseDsn(dsn: string | undefined): Dsn | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\/+|\/+$/g, "");
    if (url.protocol !== "https:" || !url.username || !/^\d+$/.test(projectId)) return null;
    if (!/(^|\.)sentry\.io$/.test(url.hostname)) return null;
    return { endpoint: `https://${url.host}/api/${projectId}/envelope/`, publicKey: url.username };
  } catch {
    return null;
  }
}

type Frame = { function?: string; filename?: string; lineno?: number; colno?: number; in_app?: boolean };

/** "at fn (file:12:3)" lines -> Sentry frames, oldest first as Sentry expects. */
export function stackFrames(stack: string | undefined): Frame[] {
  if (!stack) return [];
  const frames: Frame[] = [];
  for (const line of stack.split("\n").slice(1, 40)) {
    const m = line.match(/^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?\s*$/);
    if (!m) continue;
    const filename = m[2];
    frames.push({
      function: m[1] || "<anonymous>",
      filename,
      lineno: Number(m[3]),
      colno: Number(m[4]),
      in_app: !/node_modules|node:internal|\/next\/dist\//.test(filename),
    });
  }
  return frames.reverse();
}

/** Next.js uses thrown errors for not-found pages and redirects; those are not faults. */
export function isExpected(error: unknown) {
  const digest = typeof error === "object" && error !== null && "digest" in error ? String((error as { digest: unknown }).digest) : "";
  return /^NEXT_(HTTP_ERROR_FALLBACK|REDIRECT|NOT_FOUND)/.test(digest);
}

export function buildEnvelope(
  error: unknown,
  where: { path: string; method: string; routePath?: string; routeType?: string },
  meta: { dsn: string; environment: string; release?: string; eventId: string; now: Date },
) {
  const err = error instanceof Error ? error : new Error(String(error));
  const digest = typeof error === "object" && error !== null && "digest" in error ? String((error as { digest: unknown }).digest) : undefined;
  // Only the path: query strings can carry search terms and tokens.
  const path = where.path.split("?")[0].slice(0, 300);
  const event = {
    event_id: meta.eventId,
    timestamp: meta.now.toISOString(),
    platform: "node",
    level: "error",
    environment: meta.environment,
    release: meta.release,
    transaction: where.routePath ?? path,
    exception: { values: [{ type: err.name || "Error", value: err.message.slice(0, 2000), stacktrace: { frames: stackFrames(err.stack) } }] },
    request: { url: path, method: where.method },
    tags: { route: where.routePath ?? "unknown", routeType: where.routeType ?? "unknown", ...(digest ? { digest } : {}) },
  };
  return [
    JSON.stringify({ event_id: meta.eventId, sent_at: meta.now.toISOString(), dsn: meta.dsn }),
    JSON.stringify({ type: "event" }),
    JSON.stringify(event),
  ].join("\n");
}

/** Sends one error to Sentry. Never throws: reporting must not break the page. */
export async function reportError(error: unknown, where: { path: string; method: string; routePath?: string; routeType?: string }) {
  const raw = process.env.SENTRY_DSN;
  const dsn = parseDsn(raw);
  if (!dsn || !raw || isExpected(error)) return;
  try {
    const body = buildEnvelope(error, where, {
      dsn: raw,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12),
      eventId: crypto.randomUUID().replace(/-/g, ""),
      now: new Date(),
    });
    await fetch(dsn.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${dsn.publicKey}, sentry_client=bx-news/1.0`,
      },
      body,
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Reporting is best effort.
  }
}
