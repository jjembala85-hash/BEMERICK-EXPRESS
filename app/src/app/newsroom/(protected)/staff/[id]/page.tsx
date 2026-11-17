import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireStaff } from "@/lib/session";
import { isStorageReady } from "@/lib/media";
import { getProfileForEditing } from "@/lib/queries/profile";
import { ProfileForm } from "@/components/newsroom/profile-form";

export const metadata: Metadata = { title: "Staff profile" };

export default async function StaffProfilePage({ params }: PageProps<"/newsroom/staff/[id]">) {
  const staff = await requireStaff("staff.manage");
  const { id } = await params;
  if (id === staff.id) redirect("/newsroom/profile");
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) notFound();
  const profile = await getProfileForEditing(id);
  if (!profile) notFound();

  return (
    <>
      <Link href="/newsroom/staff" className="text-sm font-semibold text-lake-ink hover:underline">← Staff</Link>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-3xl font-bold text-ink">{profile.displayName}</h1>
        {profile.isPublic && (
          <Link href={`/author/${profile.slug}`} className="text-sm font-semibold text-lake-ink hover:underline">
            View author page →
          </Link>
        )}
      </div>
      <p className="mb-6 mt-1 text-slate">
        {profile.email}. Agree any change to someone&apos;s public profile with them first.
      </p>
      <ProfileForm values={profile} storageReady={isStorageReady()} />
    </>
  );
}
