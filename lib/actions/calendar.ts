"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/current-team";
import { calendarEventSchema } from "@/lib/validation/calendar";

export type ActionState = { error: string } | { success: true } | null;

function parseEventForm(formData: FormData) {
  return calendarEventSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    date: formData.get("date"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    location: formData.get("location"),
    description: formData.get("description"),
    event_group_id: formData.get("event_group_id"),
  });
}

// RLS (see supabase/db/migrations/102_rls_policies.sql, calendar_events_*
// policies) is the real authorization boundary here: a whole-team event
// requires head_coach, a group-scoped event requires head_coach or that
// group's event_coach. These actions don't re-check role client-side beyond
// what the UI already hides — a rejected insert/update/delete just surfaces
// the Postgres error as a toast.

export async function createCalendarEvent(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseEventForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const team = await getCurrentTeam();
  if (!team) {
    return { error: "You must be on a team." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const { error } = await supabase.from("calendar_events").insert({
    team_id: team.teamId,
    event_group_id: parsed.data.event_group_id ?? null,
    type: parsed.data.type,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    date: parsed.data.date,
    start_time: parsed.data.start_time ?? null,
    end_time: parsed.data.end_time ?? null,
    location: parsed.data.location ?? null,
    created_by: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/calendar");
  return { success: true };
}

export async function updateCalendarEvent(
  eventId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseEventForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("calendar_events")
    .update({
      event_group_id: parsed.data.event_group_id ?? null,
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      date: parsed.data.date,
      start_time: parsed.data.start_time ?? null,
      end_time: parsed.data.end_time ?? null,
      location: parsed.data.location ?? null,
    })
    .eq("id", eventId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/calendar");
  return { success: true };
}

export async function deleteCalendarEvent(
  eventId: string,
): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", eventId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/calendar");
  return null;
}
