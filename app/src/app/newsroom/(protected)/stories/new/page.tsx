import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { section } from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { can } from "@/lib/permissions";
import { StoryForm } from "@/components/newsroom/story-form";

export const metadata: Metadata = { title: "New story" };

export default async function NewStoryPage() {
  const staff = await requireStaff("article.create");
  const sections = await getDb()
    .select({ id: section.id, name: section.name })
    .from(section)
    .where(eq(section.isActive, true))
    .orderBy(section.sortOrder);

  return (
    <>
      <Link href="/newsroom/stories" className="text-sm font-semibold text-lake-ink hover:underline">← Stories</Link>
      <h1 className="mb-6 mt-2 font-serif text-3xl font-bold text-ink">New story</h1>
      <StoryForm
        values={{ status: "draft", headline: "", standfirst: "", sectionId: "", type: "news", slug: "", body: null, slugLocked: false }}
        sections={sections}
        canPublish={can(staff.role, "article.publish")}
        canUnpublish={false}
      />
    </>
  );
}
