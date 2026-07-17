"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";
import { buildWorkoutData, logFormSchema } from "@/lib/validation/logs";

export type LogActionState = { error: string } | { success: true } | null;

// Logs a workout for the signed-in athlete. RLS (workout_logs_insert) already
// enforces athlete_id = auth.uid(), but we set it explicitly too so the
// insert can't be spoofed to another athlete via a tampered form field.
export async function logWorkout(
  _prevState: LogActionState,
  formData: FormData,
): Promise<LogActionState> {
  const parsed = logFormSchema.safeParse(Object.fromEntries(formData.entries()));
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

  const { error } = await supabase.from("workout_logs").insert({
    athlete_id: user.id,
    training_day_id: parsed.data.training_day_id || null,
    workout_type: parsed.data.workout_type,
    data: buildWorkoutData(parsed.data) as Json,
    effort_rating: parsed.data.effort_rating,
    notes: parsed.data.notes || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/log");
  revalidatePath("/log/history");
  return { success: true };
}
