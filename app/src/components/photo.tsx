import type { Photo } from "@/lib/media";

/**
 * A story photo in a fixed 16:9 frame, so the page never jumps while it loads.
 * `sizes` tells the phone which of the stored widths to download.
 */
export function PhotoFrame({
  photo,
  sizes,
  priority = false,
  className = "",
}: {
  photo: Photo;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    // Plain <img>: the photo is already resized at upload, so no image service is needed.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo.src}
      srcSet={photo.srcSet || undefined}
      sizes={sizes}
      alt={photo.alt}
      width={photo.width ?? undefined}
      height={photo.height ?? undefined}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={`aspect-video w-full bg-mist object-cover ${className}`}
    />
  );
}
