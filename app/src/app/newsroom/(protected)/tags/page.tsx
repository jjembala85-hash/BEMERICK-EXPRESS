import type { Metadata } from "next";
import { requireStaff } from "@/lib/session";
import { allTagsWithCounts } from "@/lib/queries/tags";
import { TagRow } from "@/components/newsroom/tag-manager";

export const metadata: Metadata = { title: "Tags" };

export default async function TagsPage({ searchParams }: PageProps<"/newsroom/tags">) {
  await requireStaff("tags.manage");
  const q = (await searchParams).q;
  const search = typeof q === "string" ? q.trim().toLowerCase().slice(0, 60) : "";
  const all = await allTagsWithCounts();
  const shown = search ? all.filter((t) => t.name.toLowerCase().includes(search) || t.slug.includes(search)) : all;
  const unused = all.filter((t) => t.stories === 0).length;

  return (
    <>
      <h1 className="font-serif text-3xl font-bold text-ink">Tags</h1>
      <p className="mt-1 max-w-3xl text-slate">
        Writers add tags in the story editor; each tag with published stories gets a topic page. Tidy them here: fix names,
        add a short description, and merge duplicates such as “Fuel price” and “Fuel prices”.
      </p>

      <form action="/newsroom/tags" role="search" className="mt-6 flex gap-2">
        <label htmlFor="tag-search" className="sr-only">Search tags</label>
        <input
          id="tag-search"
          name="q"
          type="search"
          defaultValue={search}
          maxLength={60}
          placeholder="Search tags"
          className="w-full max-w-sm rounded-md border border-mist bg-surface px-3 py-2.5 text-ink outline-none focus:border-lake-ink focus:ring-2 focus:ring-lake-ink/20"
        />
        <button type="submit" className="rounded-md border border-lake-ink px-4 py-2 font-semibold text-lake-ink hover:bg-mist">Search</button>
      </form>
      <p className="mt-3 text-sm text-slate">
        {all.length} {all.length === 1 ? "tag" : "tags"}
        {unused > 0 ? ` · ${unused} not used by any story` : ""}
      </p>

      {shown.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-mist p-8 text-center text-slate">
          {search ? `No tags match “${search}”.` : "No tags yet. Add some in the story editor."}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {shown.map((t) => (
            <li key={t.id}>
              <TagRow
                value={{ id: t.id, name: t.name, slug: t.slug, description: t.description ?? "", stories: t.stories }}
                others={all.filter((o) => o.id !== t.id).map((o) => ({ id: o.id, name: o.name }))}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
