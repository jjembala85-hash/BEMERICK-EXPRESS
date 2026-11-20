// Ad counters (D-044). GET = a reader clicked the banner: count it, then send
// them to the advertiser. POST = the banner was seen (sent once per page view by
// components/ad-view.tsx). Only daily totals are kept; bots are not counted.
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { ad } from "@/db/schema";
import { isAdId, isBot, recordAdEvent } from "@/lib/ad-stats";
import { siteUrl } from "@/lib/site";

const noStore = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };

export async function GET(request: Request, { params }: RouteContext<"/api/ad/[id]">) {
  const { id } = await params;
  const [row] = isAdId(id) ? await getDb().select({ linkUrl: ad.linkUrl }).from(ad).where(eq(ad.id, id)).limit(1) : [];
  if (!row) return Response.redirect(siteUrl(), 302);
  if (!isBot(request.headers.get("user-agent"))) after(() => recordAdEvent(id, "clicks").catch(() => {}));
  return new Response(null, { status: 302, headers: { Location: row.linkUrl, "Referrer-Policy": "origin", ...noStore } });
}

export async function POST(request: Request, { params }: RouteContext<"/api/ad/[id]">) {
  const { id } = await params;
  if (isAdId(id) && !isBot(request.headers.get("user-agent"))) {
    // Unknown ids fail the foreign key and are ignored.
    after(() => recordAdEvent(id, "views").catch(() => {}));
  }
  return new Response(null, { status: 204, headers: noStore });
}
