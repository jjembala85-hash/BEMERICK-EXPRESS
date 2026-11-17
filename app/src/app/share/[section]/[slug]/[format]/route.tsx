// Share images for a published story: /share/<section>/<slug>/<link|square|story>.
// Only stories readers can see get an image (getStory checks that).
import { getStory } from "@/lib/queries/public";
import { isShareFormat, renderShareImage } from "@/lib/share-image";
import { siteHost } from "@/lib/site";
import sharp from "sharp";

export async function GET(request: Request, { params }: RouteContext<"/share/[section]/[slug]/[format]">) {
  const { section, slug, format } = await params;
  if (!isShareFormat(format)) return new Response("Not found", { status: 404 });
  const story = await getStory(section, slug);
  if (!story) return new Response("Not found", { status: 404 });

  // The largest stored size makes the sharpest card.
  const largest = story.photo?.srcSet.split(", ").at(-1)?.split(" ")[0] ?? story.photo?.src ?? null;
  const image = await renderShareImage(format, {
    headline: story.headline,
    kicker: story.sectionName,
    breaking: story.priority === "breaking",
    photoUrl: largest,
    credit: story.photo?.credit,
    host: siteHost(),
  });

  // The renderer makes PNG; as JPEG a photo card is ~10x smaller. WhatsApp skips
  // large preview images, and readers pay for data.
  const jpeg = await sharp(Buffer.from(await image.arrayBuffer())).jpeg({ quality: 80, mozjpeg: true }).toBuffer();

  const download = new URL(request.url).searchParams.get("download") === "1";
  const headers = new Headers({ "Content-Type": "image/jpeg" });
  // Cached at Vercel's edge; the ?v= in links changes whenever the story is updated.
  headers.set("Cache-Control", "public, max-age=600, s-maxage=86400, stale-while-revalidate=604800");
  if (download) headers.set("Content-Disposition", `attachment; filename="bx-${slug.slice(0, 50)}-${format}.jpg"`);
  return new Response(new Uint8Array(jpeg), { status: 200, headers });
}
