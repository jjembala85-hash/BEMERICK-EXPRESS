// Browser-side photo preparation and upload, shared by the story editor and
// the photo library. The server re-checks everything (api/newsroom/media).

export type PickedPhoto = {
  id: string;
  previewUrl: string;
  altText: string;
  credit: string;
  caption: string | null;
};

// Keep in step with PHOTO_WIDTHS in src/lib/media.ts.
const WIDTHS = [480, 960, 1600];
const MIN_WIDTH = 480;

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Shrinks the photo in the browser so a phone on mobile data uploads kilobytes, not megabytes. */
async function resize(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    if (bitmap.width < MIN_WIDTH) {
      throw new Error(`This photo is too small (${bitmap.width} pixels wide). Use one at least ${MIN_WIDTH} pixels wide.`);
    }
    const widths = [...new Set(WIDTHS.map((w) => Math.min(w, bitmap.width)))];
    const blobs: Blob[] = [];
    for (const width of widths) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = Math.round((bitmap.height * width) / bitmap.width);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("This browser cannot prepare photos. Try Chrome.");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      // WebP is smaller; browsers that cannot make it (Safari) fall back to JPEG.
      let blob = await toBlob(canvas, "image/webp", 0.8);
      if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", 0.82);
      if (!blob) throw new Error("The photo could not be prepared. Try a different one.");
      blobs.push(blob);
    }
    return blobs;
  } finally {
    bitmap.close();
  }
}

/** Resizes and uploads one photo. Throws an Error with a message fit to show the user. */
export async function uploadPhoto(
  file: File,
  details: { altText: string; credit: string; caption: string },
): Promise<PickedPhoto> {
  if (!details.altText.trim()) throw new Error("Describe the photo for readers who cannot see it.");
  if (!details.credit.trim()) throw new Error("Add the photo credit. Every photo must be credited.");
  let blobs: Blob[];
  try {
    blobs = await resize(file);
  } catch (e) {
    throw e instanceof Error && e.message.startsWith("This")
      ? e
      : new Error("This file could not be opened as a photo. Use a JPEG, PNG or WebP.");
  }
  const form = new FormData();
  for (const blob of blobs) form.append("file", blob);
  form.append("altText", details.altText);
  form.append("credit", details.credit);
  form.append("caption", details.caption);
  const res = await fetch("/api/newsroom/media", { method: "POST", body: form });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.id) throw new Error(data?.error ?? "The upload failed. Check your connection and try again.");
  return data as PickedPhoto;
}
