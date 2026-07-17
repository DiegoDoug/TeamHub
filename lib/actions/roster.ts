"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createEventGroupSchema,
  addByEmailSchema,
} from "@/lib/validation/roster";

export type ActionState = { error: string } | null;

export async function createEventGroup(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createEventGroupSchema.safeParse({
    name: formData.get("name"),
    eventCoachId: formData.get("eventCoachId") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: teamRow } = await supabase
    .from("team_members")
    .select("team_id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!teamRow) return { error: "No team found." };

  const { error } = await supabase.from("event_groups").insert({
    team_id: teamRow.team_id,
    name: parsed.data.name,
    event_coach_id: parsed.data.eventCoachId || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/team/roster");
  return null;
}

export async function addMemberByEmail(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = addByEmailSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: teamRow } = await supabase
    .from("team_members")
    .select("team_id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!teamRow) return { error: "No team found." };

  const { data: found, error: lookupError } = await supabase
    .rpc("lookup_profile_by_email", { p_email: parsed.data.email })
    .maybeSingle();

  if (lookupError) return { error: lookupError.message };
  if (!found) {
    return {
      error: "No account found for that email — they need to sign up first.",
    };
  }

  const { error } = await supabase.from("team_members").insert({
    team_id: teamRow.team_id,
    profile_id: found.id,
    role: parsed.data.role,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That person is already on the team." };
    }
    return { error: error.message };
  }

  revalidatePath("/team/roster");
  return null;
}

export async function addAthleteToGroup(eventGroupId: string, profileId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_group_members")
    .insert({ event_group_id: eventGroupId, profile_id: profileId });
  if (error && error.code !== "23505") throw new Error(error.message);
  revalidatePath("/team/roster");
}

export async function removeAthleteFromGroup(
  eventGroupId: string,
  profileId: string,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_group_members")
    .delete()
    .eq("event_group_id", eventGroupId)
    .eq("profile_id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath("/team/roster");
}

export async function updateMemberRole(
  teamMemberId: string,
  role: "head_coach" | "event_coach" | "athlete",
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("team_members")
    .update({ role })
    .eq("id", teamMemberId);
  if (error) throw new Error(error.message);
  revalidatePath("/team/roster");
}

export async function removeMember(teamMemberId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", teamMemberId);
  if (error) throw new Error(error.message);
  revalidatePath("/team/roster");
}
