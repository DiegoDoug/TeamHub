"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  updateProfileSchema,
  type UpdateProfileValues,
} from "@/lib/validation/profile";

export type ActionState = { error: string } | { success: true } | null;

// Bound with the profile id from the page (`updateProfile.bind(null, profileId)`)
// so the client component's useActionState dispatcher matches the expected
// (prevState, payload) shape while still knowing which row to update.
export async function updateProfile(
  profileId: string,
  _prevState: ActionState,
  values: UpdateProfileValues,
): Promise<ActionState> {
  const parsed = updateProfileSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  // RLS already restricts profile updates to the owner (id = auth.uid()),
  // but assert it here too before attempting the write (defense in depth).
  if (user.id !== profileId) {
    return { error: "You can only edit your own profile." };
  }

  // Drop the optional date key entirely when blank rather than storing "".
  const prs = parsed.data.prs.map(({ event, mark, date }) => ({
    event,
    mark,
    ...(date ? { date } : {}),
  }));

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      primary_events: parsed.data.primary_events,
      prs,
    })
    .eq("id", profileId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/profile/${profileId}`);
  return { success: true };
}
