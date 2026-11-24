// A story was read (sent once per page view by components/story-view.tsx). Only a
// daily total per story is kept, for "Most read"; robots are not counted (D-048).
import { after } from "next/server";
import { isAdId, isBot } from "@/lib/ad-stats";
import { recordStoryView } from "@/lib/story-views";

export async function POST(request: Request, { params }: RouteContext<"/api/view/[id]">) {
  const { id } = await params;
  // isAdId only checks the id looks like a uuid; unknown ids fail the foreign key and are ignored.
  if (isAdId(id) && !isBot(request.headers.get("user-agent"))) after(() => recordStoryView(id).catch(() => {}));
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
