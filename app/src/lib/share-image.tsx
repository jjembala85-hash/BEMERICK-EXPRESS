// Branded share images (docs/01-brand-identity.md §5): full-bleed lead photo,
// Deep Lake gradient, gold section kicker, Newsreader headline, BX brand bar
// and the photo credit. Server only (uses fs and sharp; Vercel, D-035).
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

export const SHARE_FORMATS = {
  link: { width: 1200, height: 630, label: "Link preview (1200×630)" },
  square: { width: 1080, height: 1080, label: "Square post (1080×1080)" },
  story: { width: 1080, height: 1920, label: "Status / TikTok cover (1080×1920)" },
} as const;

export type ShareFormat = keyof typeof SHARE_FORMATS;

export function isShareFormat(value: string): value is ShareFormat {
  return Object.hasOwn(SHARE_FORMATS, value);
}

/** Headline size so it fits in three lines (auto-shrink, brand §5). */
export function headlineSize(format: ShareFormat, length: number) {
  const base = { link: 62, square: 76, story: 92 }[format];
  if (length <= 50) return base;
  if (length <= 80) return Math.round(base * 0.84);
  if (length <= 110) return Math.round(base * 0.72);
  return Math.round(base * 0.62);
}

const fonts = Promise.all([
  readFile(join(process.cwd(), "assets/fonts/Newsreader-Bold.ttf")),
  readFile(join(process.cwd(), "assets/fonts/InstrumentSans-Regular.ttf")),
  readFile(join(process.cwd(), "assets/fonts/InstrumentSans-Bold.ttf")),
]);
const mark = readFile(join(process.cwd(), "public/bx-mark-reverse.svg"), "base64").then((b) => `data:image/svg+xml;base64,${b}`);

/**
 * Fetches our own photo and crops it to the card, as JPEG (the image renderer
 * cannot read WebP). Returns null if the photo cannot be loaded in time.
 */
async function photoFor(url: string, width: number, height: number) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const jpeg = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(width, height, { fit: "cover", position: "attention" })
      .jpeg({ quality: 82 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

export type ShareCard = {
  headline: string;
  kicker: string;
  breaking?: boolean;
  photoUrl?: string | null;
  credit?: string | null;
  host: string;
};

export async function renderShareImage(format: ShareFormat, card: ShareCard) {
  const { width, height } = SHARE_FORMATS[format];
  const [[newsreader, sans, sansBold], logo, photo] = await Promise.all([
    fonts,
    mark,
    card.photoUrl ? photoFor(card.photoUrl, width, height) : Promise.resolve(null),
  ]);
  const scale = width / 1200;
  const pad = Math.round((format === "link" ? 56 : 72) * (format === "link" ? 1 : scale * 1.1));
  const size = headlineSize(format, card.headline.length);

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", background: "#0E3B43", fontFamily: "Instrument Sans" }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img src={photo} width={width} height={height} style={{ position: "absolute", top: 0, left: 0, width, height }} />
        ) : (
          // No photo: Lake Ink with the gold "express" stroke as a large watermark.
          <div style={{ position: "absolute", top: 0, left: 0, width, height, display: "flex", background: "linear-gradient(135deg, #0E3B43 0%, #082A30 100%)" }}>
            <div style={{ position: "absolute", right: -width * 0.1, top: -height * 0.2, width: width * 0.08, height: height * 1.6, background: "#D9A441", opacity: 0.18, transform: "rotate(28deg)" }} />
          </div>
        )}
        {/* Deep Lake gradient from the bottom so text always reads. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: format === "link" ? "78%" : "62%",
            background: "linear-gradient(to top, rgba(8,42,48,0.97) 0%, rgba(8,42,48,0.88) 45%, rgba(8,42,48,0) 100%)",
          }}
        />
        <div style={{ position: "absolute", left: pad, right: pad, bottom: pad, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 * Math.max(scale, 1) }}>
            {card.breaking ? (
              <div style={{ display: "flex", background: "#C8401F", color: "white", fontSize: 26 * Math.max(scale, 0.9), fontWeight: 700, letterSpacing: 3, padding: "6px 14px", borderRadius: 4 }}>
                BREAKING
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 8, height: 30 * Math.max(scale, 0.9), background: "#D9A441" }} />
                <div style={{ color: "#D9A441", fontSize: 26 * Math.max(scale, 0.9), fontWeight: 700, letterSpacing: 4 }}>{card.kicker.toUpperCase()}</div>
              </div>
            )}
          </div>
          <div
            style={{
              display: "block",
              marginTop: 18,
              color: "white",
              fontFamily: "Newsreader",
              fontSize: size,
              lineHeight: 1.12,
              lineClamp: 3,
            }}
          >
            {card.headline}
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: format === "link" ? 28 : 44, paddingTop: 20, borderTop: "2px solid rgba(217,164,65,0.55)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={logo} width={52} height={52} style={{ borderRadius: 10 }} />
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 16 }}>
              <div style={{ color: "white", fontFamily: "Newsreader", fontSize: 28, letterSpacing: 2 }}>BEMERICK EXPRESS</div>
              <div style={{ color: "#E4ECEA", fontSize: 20 }}>{card.host}</div>
            </div>
            {photo && card.credit && (
              <div style={{ marginLeft: "auto", color: "rgba(228,236,234,0.8)", fontSize: 18, maxWidth: width * 0.4, textAlign: "right" }}>
                {`Photo: ${card.credit}`}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    {
      width,
      height,
      fonts: [
        { name: "Newsreader", data: newsreader, weight: 700, style: "normal" },
        { name: "Instrument Sans", data: sans, weight: 400, style: "normal" },
        { name: "Instrument Sans", data: sansBold, weight: 700, style: "normal" },
      ],
    },
  );
}
