import { jsonLdText } from "@/lib/structured-data";

/** Structured data for search engines. Content is escaped by jsonLdText. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(data) }} />;
}
