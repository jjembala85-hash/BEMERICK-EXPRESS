// Per-section RSS, e.g. /business/rss.xml.
import { getSection } from "@/lib/sections";
import { rssResponse } from "@/lib/rss";

export async function GET(_request: Request, { params }: RouteContext<"/[section]/rss.xml">) {
  const section = getSection((await params).section);
  if (!section) return new Response("Not found", { status: 404 });
  return rssResponse({ sectionSlug: section.slug, sectionName: section.name });
}
