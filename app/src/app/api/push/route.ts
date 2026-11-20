// Breaking-news alert sign-up (D-044). POST saves a browser's push address;
// DELETE removes it. Closed while reader sign-ups are switched off.
import { parseSubscription, pushConfigured, removeSubscription, saveSubscription } from "@/lib/push";
import { readerSignupsEnabled } from "@/lib/site";
import { withinHourlyLimit } from "@/lib/throttle";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

/** Only our own pages may call this (browsers send Origin on POST/DELETE). */
function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

async function readBody(request: Request) {
  const text = await request.text().catch(() => "");
  if (text.length > 4000) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!readerSignupsEnabled() || !pushConfigured()) return json({ error: "Alerts are not available yet." }, 404);
  if (!sameOrigin(request)) return json({ error: "Not allowed." }, 403);
  const keys = parseSubscription(await readBody(request));
  if (!keys) return json({ error: "This browser sent an alert sign-up we could not read." }, 400);
  if (!(await withinHourlyLimit("push", 20))) return json({ error: "Too many sign-ups from this network. Try again later." }, 429);
  await saveSubscription(keys);
  return json({ ok: true }, 201);
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Not allowed." }, 403);
  const body = (await readBody(request)) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint === "string" && body.endpoint.length <= 1000) await removeSubscription(body.endpoint);
  return json({ ok: true });
}
