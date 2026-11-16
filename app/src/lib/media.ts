// Photo storage on Cloudflare R2 (docs/03-technical-architecture.md section 4).
// Uploads go through R2's S3-compatible API so the same code runs on Vercel
// and on Cloudflare Workers. Photos are read straight from the public bucket.
import { AwsClient } from "aws4fetch";

/** Widths made in the newsroom browser at upload time. */
export const PHOTO_WIDTHS = [480, 960, 1600] as const;
export const MAX_PHOTO_BYTES = 1_500_000;

// Public address of the bucket. Not a secret. Replace with the
// img.bemerickexpress.com custom domain once the domain is bought (D-021).
const DEFAULT_PUBLIC_URL = "https://pub-ade49cf4d69b42b3b99c025d69f41570.r2.dev";

const publicBase = () => (process.env.MEDIA_PUBLIC_URL ?? DEFAULT_PUBLIC_URL).replace(/\/+$/, "");

export function mediaUrl(key: string) {
  return `${publicBase()}/${key}`;
}

function storageConfig() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket: process.env.R2_MEDIA_BUCKET ?? "bemerick-express-media",
  };
}

export function isStorageReady() {
  return storageConfig() !== null;
}

/** Stores one file. Keys are unique per upload, so files can be cached forever. */
export async function putMedia(key: string, body: ArrayBuffer, contentType: string) {
  const config = storageConfig();
  if (!config) throw new Error("Photo storage is not connected");
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const res = await client.fetch(
    `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}/${key}`,
    {
      method: "PUT",
      body,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
  if (!res.ok) throw new Error(`Photo storage refused the upload (${res.status})`);
}

export type PhotoRecord = {
  r2Key: string;
  variants: unknown; // { "480": key, "960": key, "1600": key }
  width: number | null;
  height: number | null;
  altText: string;
  credit: string;
  caption: string | null;
};

export type Photo = {
  src: string;
  srcSet: string;
  width: number | null;
  height: number | null;
  alt: string;
  credit: string;
  caption: string | null;
};

/** Turns a media row into what an <img> needs. Null when the story has no photo. */
export function toPhoto(record: PhotoRecord | null): Photo | null {
  if (!record?.r2Key) return null;
  const variants =
    record.variants && typeof record.variants === "object"
      ? Object.entries(record.variants as Record<string, unknown>)
          .filter((entry): entry is [string, string] => /^\d+$/.test(entry[0]) && typeof entry[1] === "string")
          .sort((a, b) => Number(a[0]) - Number(b[0]))
      : [];
  return {
    src: mediaUrl(record.r2Key),
    srcSet: variants.map(([width, key]) => `${mediaUrl(key)} ${width}w`).join(", "),
    width: record.width,
    height: record.height,
    alt: record.altText,
    credit: record.credit,
    caption: record.caption,
  };
}
