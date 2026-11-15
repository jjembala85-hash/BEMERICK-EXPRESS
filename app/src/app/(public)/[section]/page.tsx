import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sections, getSection } from "@/lib/sections";

// Placeholder section page. Story lists arrive in Phase 2.
export function generateStaticParams() {
  return sections.map((s) => ({ section: s.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[section]">): Promise<Metadata> {
  const section = getSection((await params).section);
  return section
    ? { title: section.name, description: section.description }
    : {};
}

export default async function SectionPage({ params }: PageProps<"/[section]">) {
  const section = getSection((await params).section);
  if (!section) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="border-b-2 border-crane-gold pb-4">
        <h1 className="font-serif text-4xl font-bold text-ink">{section.name}</h1>
        <p className="mt-2 text-slate">{section.description}</p>
      </div>
      <p className="mt-8 text-slate">
        Stories in {section.name} will appear here.
      </p>
    </div>
  );
}
