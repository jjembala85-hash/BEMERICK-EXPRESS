// Photos for readers (D-040): fetched once from the R2 bucket, then served from
// Vercel's edge cache. Keys never change (each upload gets a new name), so the
// copy can be kept for a year without ever being out of date.
import { MEDIA_KEY, mediaOriginUrl } from "@/lib/media";

const YEAR = 31_536_000;

export async function GET(_request: Request, { params }: RouteContext<"/img/[...key]">) {
  const key = (await params).key.join("/");
  if (!MEDIA_KEY.test(key)) return new Response("Not found", { status: 404 });

  const origin = await fetch(mediaOriginUrl(key), { signal: AbortSignal.timeout(10_000) }).catch(() => null);
  if (!origin?.ok || !origin.body) return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });

  return new Response(origin.body, {
    headers: {
      "Content-Type": origin.headers.get("content-type") ?? "image/webp",
      ...(origin.headers.get("content-length") ? { "Content-Length": origin.headers.get("content-length")! } : {}),
      "Cache-Control": `public, max-age=${YEAR}, immutable`,
      "CDN-Cache-Control": `public, max-age=${YEAR}, immutable`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
