"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { joinByCodeSchema } from "@/lib/validation/roster";

export type ActionState = { error: string } | null;

export type PendingRosterEntry = {
  pendingId: string;
  fullName: string;
  eventGroupName: string | null;
};

export type JoinCodeLookup =
  | { error: string }
  | { teamName: string; entries: PendingRosterEntry[] };

// Uses the SECURITY DEFINER list_pending_roster_by_join_code RPC
// (supabase/db/migrations/201_roster_import.sql) since the caller isn't a
// team member yet — that's the entire point of a join code.
export async function lookupTeamByJoinCode(
  codeInput: string,
): Promise<JoinCodeLookup> {
  const parsed = joinByCodeSchema.safeParse({ code: codeInput });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_pending_roster_by_join_code", {
    p_code: parsed.data.code,
  });
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "No team found for that code." };
  }

  const teamName = data[0].team_name as string;
  const entries: PendingRosterEntry[] = (
    data as {
      pending_id: string | null;
      full_name: string | null;
      event_group_name: string | null;
    }[]
  )
    .filter((row) => row.pending_id !== null)
    .map((row) => ({
      pendingId: row.pending_id as string,
      fullName: row.full_name as string,
      eventGroupName: row.event_group_name,
    }));

  return { teamName, entries };
}

export async function claimRosterSlot(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const pendingId = String(formData.get("pendingId") ?? "");
  const code = String(formData.get("code") ?? "");
  if (!pendingId || !code) {
    return { error: "Pick your name from the list first." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_roster_slot", {
    p_pending_id: pendingId,
    p_code: code.trim().toUpperCase(),
  });
  if (error) return { error: error.message };

  redirect("/dashboard");
}
