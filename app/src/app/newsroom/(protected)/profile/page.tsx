import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/session";
import { isStorageReady } from "@/lib/media";
import { getProfileForEditing } from "@/lib/queries/profile";
import { ProfileForm } from "@/components/newsroom/profile-form";

export const metadata: Metadata = { title: "My profile" };

export default async function MyProfilePage() {
  const staff = await requireStaff();
  const profile = await getProfileForEditing(staff.id);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-3xl font-bold text-ink">My profile</h1>
        {profile?.isPublic && (
          <Link href={`/author/${profile.slug}`} className="text-sm font-semibold text-lake-ink hover:underline">
            View my author page →
          </Link>
        )}
      </div>
      <p className="mb-6 mt-1 text-slate">How readers see you on bylines and on your author page.</p>
      {profile ? (
        <ProfileForm values={profile} storageReady={isStorageReady()} />
      ) : (
        <p className="rounded-lg border border-dashed border-mist p-6 text-slate">
          Your account has no byline profile yet. Ask an administrator to add one.
        </p>
      )}
    </>
  );
}
