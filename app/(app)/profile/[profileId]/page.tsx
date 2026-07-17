import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile/profile-form";
import { ProfileView, type ProfileDisplay } from "@/components/profile/profile-view";
import type { PrEntry } from "@/lib/validation/profile";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  const supabase = await createClient();

  const [{ data: profileRow }, {
    data: { user },
  }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, primary_events, prs")
      .eq("id", profileId)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  // RLS returns zero rows if the viewer doesn't share a team with this
  // profile (or the id doesn't exist) — either way, treat it as not found.
  if (!profileRow) notFound();

  const profile: ProfileDisplay & { id: string } = {
    id: profileRow.id,
    full_name: profileRow.full_name,
    email: profileRow.email,
    primary_events: profileRow.primary_events,
    prs: (Array.isArray(profileRow.prs) ? profileRow.prs : []) as unknown as PrEntry[],
  };

  const isOwnProfile = user?.id === profileId;

  return (
    <div className="mx-auto max-w-2xl">
      {isOwnProfile ? (
        <ProfileForm profile={profile} />
      ) : (
        <ProfileView profile={profile} />
      )}
    </div>
  );
}
