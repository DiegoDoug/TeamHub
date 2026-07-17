"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  cycleFormSchema,
  cycleUpdateSchema,
  weekFormSchema,
  weekUpdateSchema,
  dayFormSchema,
} from "@/lib/validation/cycles";

// Shared shape for every action below: `null` is the pristine/initial state,
// `{ error }` surfaces a message in the form, `{ success: true }` tells the
// dialog it's done (see components/cycles/*-dialog.tsx effects).
export type ActionState = { error: string } | { success: true } | null;

function friendlyError(error: { code?: string; message: string }): string {
  // 42501 = insufficient_privilege (RLS denied the write) — RLS is the real
  // gate here; the UI just hides controls the caller can't use, so this
  // message is a fallback for anything that slips through (e.g. stale UI).
  if (error.code === "42501") return "You don't have permission to do that.";
  return error.message;
}

// ---------------------------------------------------------------------
// Cycles
// ---------------------------------------------------------------------

export async function createCycle(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = cycleFormSchema.safeParse({
    group_id: formData.get("group_id"),
    name: formData.get("name"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
    phase: formData.get("phase"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase.from("training_cycles").insert({
    event_group_id: parsed.data.group_id,
    name: parsed.data.name,
    start_date: parsed.data.start_date ?? null,
    end_date: parsed.data.end_date ?? null,
    phase: parsed.data.phase ?? null,
  });
  if (error) return { error: friendlyError(error) };

  revalidatePath(`/groups/${parsed.data.group_id}/cycles`);
  return { success: true };
}

export async function updateCycle(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = cycleUpdateSchema.safeParse({
    id: formData.get("id"),
    group_id: formData.get("group_id"),
    name: formData.get("name"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
    phase: formData.get("phase"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("training_cycles")
    .update({
      name: parsed.data.name,
      start_date: parsed.data.start_date ?? null,
      end_date: parsed.data.end_date ?? null,
      phase: parsed.data.phase ?? null,
    })
    .eq("id", parsed.data.id);
  if (error) return { error: friendlyError(error) };

  revalidatePath(`/groups/${parsed.data.group_id}/cycles`);
  return { success: true };
}

export async function deleteCycle(
  cycleId: string,
  groupId: string,
): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { error } = await supabase.from("training_cycles").delete().eq("id", cycleId);
  if (error) return { error: friendlyError(error) };

  revalidatePath(`/groups/${groupId}/cycles`);
  return null;
}

// ---------------------------------------------------------------------
// Weeks
// ---------------------------------------------------------------------

export async function createWeek(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = weekFormSchema.safeParse({
    group_id: formData.get("group_id"),
    cycle_id: formData.get("cycle_id"),
    week_number: formData.get("week_number"),
    focus: formData.get("focus"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("training_weeks").insert({
    cycle_id: parsed.data.cycle_id,
    week_number: parsed.data.week_number,
    focus: parsed.data.focus ?? null,
    notes: parsed.data.notes ?? null,
  });
  if (error) {
    // unique (cycle_id, week_number)
    if (error.code === "23505") {
      return { error: `Week ${parsed.data.week_number} already exists in this cycle.` };
    }
    return { error: friendlyError(error) };
  }

  revalidatePath(`/groups/${parsed.data.group_id}/cycles/${parsed.data.cycle_id}`);
  return { success: true };
}

export async function updateWeek(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = weekUpdateSchema.safeParse({
    id: formData.get("id"),
    group_id: formData.get("group_id"),
    cycle_id: formData.get("cycle_id"),
    week_number: formData.get("week_number"),
    focus: formData.get("focus"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("training_weeks")
    .update({
      week_number: parsed.data.week_number,
      focus: parsed.data.focus ?? null,
      notes: parsed.data.notes ?? null,
    })
    .eq("id", parsed.data.id);
  if (error) {
    if (error.code === "23505") {
      return { error: `Week ${parsed.data.week_number} already exists in this cycle.` };
    }
    return { error: friendlyError(error) };
  }

  revalidatePath(`/groups/${parsed.data.group_id}/cycles/${parsed.data.cycle_id}`);
  return { success: true };
}

export async function deleteWeek(
  weekId: string,
  groupId: string,
  cycleId: string,
): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { error } = await supabase.from("training_weeks").delete().eq("id", weekId);
  if (error) return { error: friendlyError(error) };

  revalidatePath(`/groups/${groupId}/cycles/${cycleId}`);
  return null;
}

// ---------------------------------------------------------------------
// Days — a day slot is fixed by (week_id, day_of_week), which has a unique
// constraint, so "add" and "edit" are both just an upsert on that key.
// ---------------------------------------------------------------------

export async function saveDay(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = dayFormSchema.safeParse({
    group_id: formData.get("group_id"),
    cycle_id: formData.get("cycle_id"),
    week_id: formData.get("week_id"),
    day_of_week: formData.get("day_of_week"),
    warmup: formData.get("warmup"),
    drills: formData.get("drills"),
    main_work: formData.get("main_work"),
    cooldown: formData.get("cooldown"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("training_days").upsert(
    {
      week_id: parsed.data.week_id,
      day_of_week: parsed.data.day_of_week,
      warmup: parsed.data.warmup ?? null,
      drills: parsed.data.drills ?? null,
      main_work: parsed.data.main_work ?? null,
      cooldown: parsed.data.cooldown ?? null,
      notes: parsed.data.notes ?? null,
    },
    { onConflict: "week_id,day_of_week" },
  );
  if (error) return { error: friendlyError(error) };

  revalidatePath(
    `/groups/${parsed.data.group_id}/cycles/${parsed.data.cycle_id}/weeks/${parsed.data.week_id}`,
  );
  return { success: true };
}

export async function deleteDay(
  dayId: string,
  groupId: string,
  cycleId: string,
  weekId: string,
): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { error } = await supabase.from("training_days").delete().eq("id", dayId);
  if (error) return { error: friendlyError(error) };

  revalidatePath(`/groups/${groupId}/cycles/${cycleId}/weeks/${weekId}`);
  return null;
}
