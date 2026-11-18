// Photo storage on Cloudflare R2 (docs/03-technical-architecture.md section 4).
// Uploads go through R2's S3-compatible API so the same code runs on Vercel
// and on Cloudflare Workers. Photos are read straight from the public bucket.
import { AwsClient } from "aws4fetch";
import { siteUrl } from "./site";

/** Widths made in the newsroom browser at upload time. */
export const PHOTO_WIDTHS = [480, 960, 1600] as const;
export const MAX_PHOTO_BYTES = 1_500_000;

// The bucket's own public address (r2.dev). Not a secret. It is slow and meant
// for testing, so readers get photos through /img on our site instead, cached at
// Vercel's edge (D-040). Once the domain is bought, set MEDIA_PUBLIC_URL to
// https://img.<domain> (Cloudflare's network) and /img is no longer used.
const R2_PUBLIC_URL = "https://pub-ade49cf4d69b42b3b99c025d69f41570.r2.dev";

/** Photo keys look like photos/2026/11/<uuid>-960.webp: anything else is refused by /img. */
export const MEDIA_KEY = /^photos\/\d{4}\/\d{2}\/[0-9a-f-]{36}-\d{2,4}\.(webp|jpg|jpeg|png)$/;

/** Where readers load a photo from. */
export function mediaUrl(key: string) {
  const configured = process.env.MEDIA_PUBLIC_URL;
  if (configured) return `${configured.replace(/\/+$/, "")}/${key}`;
  return `${siteUrl()}/img/${key}`;
}

/** Where the server itself fetches a photo from (straight from the bucket). */
export function mediaOriginUrl(key: string) {
  return `${R2_PUBLIC_URL}/${key}`;
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

function storageClient() {
  const config = storageConfig();
  if (!config) throw new Error("Photo storage is not connected");
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const objectUrl = (key: string) => `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}/${key}`;
  return { client, objectUrl };
}

/** Stores one file. Keys are unique per upload, so files can be cached forever. */
export async function putMedia(key: string, body: ArrayBuffer, contentType: string) {
  const { client, objectUrl } = storageClient();
  // Sign first, then send the bytes ourselves. client.fetch() wraps the body in a
  // streamed Request, which drops Content-Length; R2 then refuses it (411).
  const signed = await client.sign(
    objectUrl(key),
    {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
      },
    },
  );
  const res = await fetch(signed.url, {
    method: "PUT",
    headers: signed.headers,
    body: new Uint8Array(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Photo storage refused the upload (${res.status})`);
}

/** Removes stored files. R2 answers 204 even when a key is already gone. */
export async function deleteMediaFiles(keys: string[]) {
  const { client, objectUrl } = storageClient();
  await Promise.all(
    keys.map(async (key) => {
      const res = await client.fetch(objectUrl(key), { method: "DELETE", cache: "no-store" });
      if (!res.ok && res.status !== 404) throw new Error(`Photo storage refused the delete (${res.status})`);
    }),
  );
}

/** Every stored key of one photo (all sizes), without repeats. */
export function allKeys(record: { r2Key: string; variants: unknown }) {
  const variants = record.variants && typeof record.variants === "object" ? Object.values(record.variants) : [];
  return [...new Set([record.r2Key, ...variants.filter((k): k is string => typeof k === "string")])];
}

/** The smallest stored size: enough for thumbnails in the newsroom. */
export function smallestKey(record: { r2Key: string; variants: unknown }) {
  const variants =
    record.variants && typeof record.variants === "object"
      ? Object.entries(record.variants as Record<string, unknown>).filter(
          (e): e is [string, string] => /^\d+$/.test(e[0]) && typeof e[1] === "string",
        )
      : [];
  variants.sort((a, b) => Number(a[0]) - Number(b[0]));
  return variants[0]?.[1] ?? record.r2Key;
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
