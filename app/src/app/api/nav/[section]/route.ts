// Headlines for a section's dropdown in the site header (D-048): the pinned (or
// newest) story, the latest and the most read. Loaded only when a reader opens a
// dropdown, so pages themselves stay light. Briefly cached at Vercel's edge.
import { getSection } from "@/lib/sections";
import { getSectionMenu } from "@/lib/queries/public";

export async function GET(_request: Request, { params }: RouteContext<"/api/nav/[section]">) {
  const { section } = await params;
  if (!getSection(section)) return new Response("Not found", { status: 404 });
  const menu = await getSectionMenu(section);
  return Response.json(menu, {
    headers: {
      // Short, so an unpublished story leaves the menus within half a minute.
      "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=30",
      "X-Robots-Tag": "noindex",
    },
  });
}
