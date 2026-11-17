// Photo upload for the newsroom. The browser has already resized the photo;
// this checks who is asking, checks the files really are images, stores them
// in R2 and records the photo with its required alt text and credit.
import { getDb } from "@/db";
import { auditLog, media } from "@/db/schema";
import { getStaff } from "@/lib/session";
import { can } from "@/lib/permissions";
import { readImageInfo } from "@/lib/image-size";
import { MAX_PHOTO_BYTES, PHOTO_WIDTHS, isStorageReady, mediaUrl, putMedia } from "@/lib/media";
import { searchPhotos } from "@/lib/queries/media";

const MAX_WIDTH = PHOTO_WIDTHS[PHOTO_WIDTHS.length - 1];

const fail = (status: number, error: string) => Response.json({ error }, { status });

/** Photo library search for the story editor's "Choose from library" panel. */
export async function GET(request: Request) {
  const staff = await getStaff();
  if (!staff) return fail(401, "Your session has ended. Sign in again.");
  const params = new URL(request.url).searchParams;
  const page = Math.min(1000, Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1));
  const { photos, hasMore } = await searchPhotos({ q: params.get("q") ?? "", page });
  return Response.json(
    {
      photos: photos.map((p) => ({
        id: p.id,
        previewUrl: p.previewUrl,
        altText: p.altText,
        credit: p.credit,
        caption: p.caption,
      })),
      hasMore,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  // Only accept uploads sent from our own pages.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) return fail(403, "This upload was blocked.");

  const staff = await getStaff();
  if (!staff) return fail(401, "Your session has ended. Sign in again.");
  if (!can(staff.role, "media.upload")) return fail(403, "You do not have permission to upload photos.");
  if (!isStorageReady()) return fail(503, "Photo storage is not connected yet.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "The upload could not be read. Try again.");
  }

  const altText = String(form.get("altText") ?? "").trim();
  const credit = String(form.get("credit") ?? "").trim();
  const caption = String(form.get("caption") ?? "").trim();
  if (!altText) return fail(400, "Describe the photo (alt text) before uploading.");
  if (!credit) return fail(400, "Add the photo credit before uploading.");
  if (altText.length > 300 || credit.length > 120 || caption.length > 300) {
    return fail(400, "The description, credit or caption is too long.");
  }

  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length < 1 || files.length > PHOTO_WIDTHS.length) return fail(400, "Choose one photo to upload.");

  const sizes = [];
  for (const file of files) {
    if (file.size > MAX_PHOTO_BYTES) return fail(400, "The photo is too large. Try a different one.");
    const body = await file.arrayBuffer();
    const info = readImageInfo(new Uint8Array(body));
    if (!info) return fail(400, "That file is not a photo we can use. Use a JPEG, PNG or WebP.");
    if (info.width > MAX_WIDTH) return fail(400, "The photo was not resized correctly. Try again.");
    sizes.push({ body, bytes: file.size, ...info });
  }
  sizes.sort((a, b) => a.width - b.width);
  if (new Set(sizes.map((s) => s.width)).size !== sizes.length) {
    return fail(400, "The photo was not resized correctly. Try again.");
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const folder = `photos/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const stored = sizes.map((s) => ({ ...s, key: `${folder}/${id}-${s.width}.${s.ext}` }));

  try {
    await Promise.all(stored.map((s) => putMedia(s.key, s.body, s.mime)));
  } catch (error) {
    console.error("Photo upload failed", error);
    return fail(502, "The photo could not be stored. Try again in a moment.");
  }

  const largest = stored[stored.length - 1];
  const db = getDb();
  await db.batch([
    db.insert(media).values({
      id,
      r2Key: largest.key,
      variants: Object.fromEntries(stored.map((s) => [String(s.width), s.key])),
      width: largest.width,
      height: largest.height,
      mime: largest.mime,
      bytes: largest.bytes,
      caption: caption || null,
      altText,
      credit,
      uploadedBy: staff.id,
    }),
    db.insert(auditLog).values({
      actorId: staff.id,
      action: "media.upload",
      entity: "media",
      entityId: id,
      details: { credit, width: largest.width, height: largest.height },
    }),
  ]);

  return Response.json({
    id,
    previewUrl: mediaUrl(stored[0].key),
    altText,
    credit,
    caption: caption || null,
  });
}
