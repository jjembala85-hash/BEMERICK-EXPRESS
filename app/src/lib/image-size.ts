// Reads the real type and pixel size from an uploaded file's first bytes,
// so the server never has to trust what the browser claims.
export type ImageInfo = { mime: "image/jpeg" | "image/webp"; ext: "jpg" | "webp"; width: number; height: number };

export function readImageInfo(bytes: Uint8Array): ImageInfo | null {
  const size = readJpeg(bytes) ?? readWebp(bytes);
  if (!size || size.width < 1 || size.height < 1) return null;
  return size;
}

function readJpeg(b: Uint8Array): ImageInfo | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker === 0xff) {
      i += 1; // padding byte
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2; // markers without a length
      continue;
    }
    const isFrameHeader = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrameHeader) {
      return {
        mime: "image/jpeg",
        ext: "jpg",
        height: (b[i + 5] << 8) | b[i + 6],
        width: (b[i + 7] << 8) | b[i + 8],
      };
    }
    i += 2 + ((b[i + 2] << 8) | b[i + 3]);
  }
  return null;
}

function readWebp(b: Uint8Array): ImageInfo | null {
  const tag = (at: number) => String.fromCharCode(b[at], b[at + 1], b[at + 2], b[at + 3]);
  if (b.length < 30 || tag(0) !== "RIFF" || tag(8) !== "WEBP") return null;
  const base = { mime: "image/webp", ext: "webp" } as const;
  switch (tag(12)) {
    case "VP8 ":
      if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
      return { ...base, width: (b[26] | (b[27] << 8)) & 0x3fff, height: (b[28] | (b[29] << 8)) & 0x3fff };
    case "VP8L": {
      if (b[20] !== 0x2f) return null;
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | ((b[24] << 24) >>> 0);
      return { ...base, width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    case "VP8X":
      return {
        ...base,
        width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)),
        height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)),
      };
    default:
      return null;
  }
}
