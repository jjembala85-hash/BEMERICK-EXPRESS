import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { article, articleTranslation, section } from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { can } from "@/lib/permissions";
import { bodyText, type RichNode } from "@/lib/rich-text";
import { storyTagText } from "@/lib/queries/tags";
import { shareImagePath, tiktokScript, whatsappText, xText, type ShareFormatName, type ShareStory } from "@/lib/share";
import { siteHost, siteUrl } from "@/lib/site";
import { CopyBox } from "@/components/newsroom/copy-box";

export const metadata: Metadata = { title: "Share kit" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const formats: { key: ShareFormatName; label: string; use: string; width: number; height: number }[] = [
  { key: "link", label: "Link card", use: "Shown automatically when the link is shared. Also good for X and Facebook posts.", width: 1200, height: 630 },
  { key: "square", label: "Square", use: "WhatsApp Channel and X posts. Breaking stories get the Ember BREAKING label.", width: 1080, height: 1080 },
  { key: "story", label: "Status / TikTok cover", use: "WhatsApp Status, TikTok and Instagram covers.", width: 1080, height: 1920 },
];

export default async function ShareKitPage({ params }: PageProps<"/newsroom/stories/[id]/share">) {
  const staff = await requireStaff("article.create");
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [story] = await getDb()
    .select({
      id: article.id,
      createdBy: article.createdBy,
      priority: article.priority,
      publishedAt: article.publishedAt,
      updatedPublicAt: article.updatedPublicAt,
      headline: articleTranslation.headline,
      standfirst: articleTranslation.standfirst,
      slug: articleTranslation.slug,
      body: articleTranslation.body,
      sectionSlug: section.slug,
      sectionName: section.name,
    })
    .from(article)
    .innerJoin(articleTranslation, and(eq(articleTranslation.articleId, article.id), eq(articleTranslation.lang, "en")))
    .innerJoin(section, eq(section.id, article.primarySectionId))
    .where(eq(article.id, id))
    .limit(1);
  if (!story) notFound();
  if (story.createdBy !== staff.id && !can(staff.role, "article.edit_any")) notFound();

  const [isPublic] = await getDb()
    .select({ id: article.id })
    .from(article)
    .where(and(eq(article.id, id), inArray(article.status, ["published", "scheduled"]), lte(article.publishedAt, new Date())))
    .limit(1);

  const back = (
    <Link href={`/newsroom/stories/${story.id}`} className="text-sm font-semibold text-lake-ink hover:underline">← Back to the story</Link>
  );
  if (!isPublic) {
    return (
      <>
        {back}
        <h1 className="mt-2 font-serif text-3xl font-bold text-ink">Share kit</h1>
        <p className="mt-4 rounded-lg border border-dashed border-mist p-6 text-slate">
          The share kit is ready once the story is published, because the images and links point to the live story.
        </p>
      </>
    );
  }

  const tags = (await storyTagText(story.id)).split(", ").filter(Boolean);
  const url = `${siteUrl()}/${story.sectionSlug}/${story.slug}`;
  const share: ShareStory = {
    headline: story.headline,
    standfirst: story.standfirst,
    section: story.sectionName,
    url,
    breaking: story.priority === "breaking",
    tags,
    body: bodyText(story.body as RichNode),
    host: siteHost(),
  };
  const version = story.updatedPublicAt ?? story.publishedAt;
  const wa = whatsappText(share);
  const x = xText(share);

  return (
    <>
      {back}
      <h1 className="mt-2 font-serif text-3xl font-bold text-ink">Share kit</h1>
      <p className="mt-1 max-w-3xl text-slate">
        Ready-made posts for <span className="font-semibold text-ink">{story.headline}</span>. WhatsApp Channels have no posting
        API, so copy the text, save the image and post it by hand. It takes under 30 seconds.
      </p>

      <section aria-labelledby="images-heading" className="mt-8">
        <h2 id="images-heading" className="font-serif text-xl font-bold text-ink">Images</h2>
        <ul className="mt-4 grid items-start gap-6 md:grid-cols-[1.6fr_1fr_0.62fr]">
          {formats.map((f) => (
            <li key={f.key} className="rounded-lg border border-mist bg-surface p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shareImagePath(story.sectionSlug, story.slug, f.key, version)}
                alt={`${f.label} image for this story`}
                width={f.width}
                height={f.height}
                loading="lazy"
                className="w-full rounded bg-mist"
                style={{ aspectRatio: `${f.width} / ${f.height}` }}
              />
              <p className="mt-2 text-sm font-semibold text-ink">{f.label}</p>
              <p className="text-xs text-slate">{f.width}×{f.height}. {f.use}</p>
              <a
                href={`${shareImagePath(story.sectionSlug, story.slug, f.key, version)}${version ? "&" : "?"}download=1`}
                className="mt-2 inline-block rounded-md border border-lake-ink px-3 py-1.5 text-sm font-semibold text-lake-ink hover:bg-mist"
              >
                Download
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="text-heading" className="mt-10 grid gap-4 lg:grid-cols-2">
        <h2 id="text-heading" className="font-serif text-xl font-bold text-ink lg:col-span-2">Text</h2>
        <CopyBox
          id="wa-text"
          label="WhatsApp (Channel, groups, Status)"
          text={wa}
          note="*Stars* make text bold in WhatsApp."
          open={{ href: `https://wa.me/?text=${encodeURIComponent(wa)}`, label: "Open in WhatsApp" }}
        />
        <CopyBox
          id="x-text"
          label="X"
          text={x}
          note={tags.length ? "Hashtags come from the story's tags." : "Add tags to the story to get hashtags."}
          open={{ href: `https://x.com/intent/post?text=${encodeURIComponent(x)}`, label: "Post on X" }}
        />
        <div className="lg:col-span-2">
          <CopyBox
            id="tiktok-text"
            label="TikTok script prompt (BX anchor format)"
            text={tiktokScript(share)}
            note="A starting point for the presenter. Check every fact against the published story before recording."
          />
        </div>
        <div className="lg:col-span-2">
          <CopyBox id="link-text" label="Story link" text={url} />
        </div>
      </section>
    </>
  );
}
