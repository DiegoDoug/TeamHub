"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createTeamSchema } from "@/lib/validation/teams";

export type ActionState = { error: string } | null;

export async function createTeam(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createTeamSchema.safeParse({ name: formData.get("name") });
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

  // The on_team_created trigger makes `user` the head_coach and creates the
  // team-wide chat channel — see supabase/db/migrations/101_functions_triggers.sql.
  const { data: team, error } = await supabase
    .from("teams")
    .insert({ name: parsed.data.name, created_by: user.id })
    .select("id")
    .single();

  if (error || !team) {
    return { error: error?.message ?? "Could not create team." };
  }

  redirect("/dashboard");
}
