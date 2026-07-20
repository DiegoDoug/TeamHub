import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ProfileWorkoutSummary = {
  id: string;
  workoutType: string;
  loggedAt: string;
  effortRating: number | null;
};

// RLS (workout_logs_select) naturally scopes this: the profile owner sees
// their own logs, a coach of that athlete sees them too, and anyone else
// (e.g. a teammate who isn't their coach) gets zero rows back — which reads
// as an empty "no recent activity" state rather than leaking anything.
export async function getRecentWorkoutsForProfile(
  profileId: string,
  limit = 5,
): Promise<ProfileWorkoutSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_logs")
    .select("id, workout_type, logged_at, effort_rating")
    .eq("athlete_id", profileId)
    .order("logged_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    workoutType: row.workout_type,
    loggedAt: row.logged_at,
    effortRating: row.effort_rating,
  }));
}
