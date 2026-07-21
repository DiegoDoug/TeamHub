"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createTeamSchema } from "@/lib/validation/teams";
import { generateJoinCode } from "@/lib/join-code";

export type ActionState = { error: string } | null;

const JOIN_CODE_INSERT_ATTEMPTS = 5;

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
  // join_code is unique (supabase/db/migrations/201_roster_import.sql), so a
  // collision on the random code is retried a few times before giving up.
  let team: { id: string } | null = null;
  let lastError: { code?: string; message: string } | null = null;
  for (let attempt = 0; attempt < JOIN_CODE_INSERT_ATTEMPTS && !team; attempt++) {
    const { data, error } = await supabase
      .from("teams")
      .insert({
        name: parsed.data.name,
        created_by: user.id,
        join_code: generateJoinCode(),
      })
      .select("id")
      .single();

    if (data) {
      team = data;
    } else {
      lastError = error;
      if (error?.code !== "23505") break;
    }
  }

  if (!team) {
    return { error: lastError?.message ?? "Could not create team." };
  }

  redirect("/dashboard");
}
