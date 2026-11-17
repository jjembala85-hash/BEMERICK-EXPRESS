import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAuthor, getLatestStories } from "@/lib/queries/public";
import { StoryList } from "@/components/story-list";

const PAGE_SIZE = 20;

type Props = PageProps<"/author/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const author = await getAuthor((await params).slug);
  if (!author) return {};
  const description = author.bio?.split("\n")[0]?.slice(0, 160) || `Stories by ${author.name} for BX News.`;
  return {
    title: author.name,
    description,
    alternates: { canonical: `/author/${author.slug}` },
    openGraph: {
      type: "profile",
      title: `${author.name} · BX News`,
      description,
      images: author.photo ? [{ url: author.photo.src, alt: author.photo.alt }] : undefined,
    },
  };
}

export default function AuthorPage({ params, searchParams }: Props) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
      <Suspense fallback={<p className="text-slate">Loading…</p>}>
        <Author params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Author({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const author = await getAuthor((await params).slug);
  if (!author) notFound();
  const pageInput = (await searchParams).page;
  const page = Math.min(500, Math.max(1, Number.parseInt(typeof pageInput === "string" ? pageInput : "1", 10) || 1));

  // One extra story tells us whether there is an older page.
  const rows = await getLatestStories({ authorId: author.userId, limit: PAGE_SIZE + 1, offset: (page - 1) * PAGE_SIZE });
  const stories = rows.slice(0, PAGE_SIZE);
  const hasMore = rows.length > PAGE_SIZE;
  const handle = author.xHandle?.replace(/^@/, "");

  return (
    <>
      <header className="flex flex-col gap-5 border-b-2 border-crane-gold pb-6 sm:flex-row sm:items-center">
        {author.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={author.photo.src}
            srcSet={author.photo.srcSet || undefined}
            sizes="128px"
            alt={author.photo.alt}
            width={128}
            height={160}
            className="aspect-[4/5] w-28 shrink-0 rounded-md bg-mist object-cover object-top sm:w-32"
          />
        )}
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate">
            <span className="inline-block h-3.5 w-1 bg-crane-gold" aria-hidden />
            BX News
          </p>
          <h1 className="mt-1 font-serif text-4xl font-bold leading-tight text-ink">{author.name}</h1>
          {author.jobTitle && (
            <p className="mt-1 text-sm font-semibold uppercase tracking-[0.08em] text-lake-ink">{author.jobTitle}</p>
          )}
          {handle && (
            <a
              href={`https://x.com/${handle}`}
              target="_blank"
              rel="noopener noreferrer me"
              className="mt-2 inline-block text-sm font-semibold text-lake-ink hover:underline"
            >
              @{handle} on X
            </a>
          )}
        </div>
      </header>

      {author.bio && (
        <div className="mt-6 max-w-2xl space-y-3 font-serif text-lg leading-relaxed text-ink">
          {author.bio
            .split(/\n+/)
            .filter((p) => p.trim())
            .map((p, i) => (
              <p key={i}>{p}</p>
            ))}
        </div>
      )}

      <section aria-labelledby="stories-heading" className="mt-10">
        <h2 id="stories-heading" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">
          Stories by {author.name}
        </h2>
        {stories.length === 0 ? (
          <p className="mt-4 text-slate">{page > 1 ? "No older stories." : `${author.name}'s stories will appear here.`}</p>
        ) : (
          <StoryList stories={stories} />
        )}
        {(page > 1 || hasMore) && (
          <nav aria-label="Pages" className="mt-6 flex items-center justify-between border-t border-mist pt-4">
            {page > 1 ? (
              <Link href={page === 2 ? `/author/${author.slug}` : `/author/${author.slug}?page=${page - 1}`} className="font-semibold text-lake-ink hover:underline">
                ← Newer
              </Link>
            ) : (
              <span />
            )}
            {hasMore ? (
              <Link href={`/author/${author.slug}?page=${page + 1}`} className="font-semibold text-lake-ink hover:underline">
                Older →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </section>
    </>
  );
}
