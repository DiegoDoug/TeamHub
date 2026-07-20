import "server-only";
import { createClient } from "@/lib/supabase/server";

export type RecentActivityItem = {
  id: string;
  athleteName: string;
  workoutType: "distance" | "speed" | "weights" | "technical";
  loggedAt: string;
};

// RLS (workout_logs_select) already scopes this to what the signed-in user
// can see: a head coach sees every athlete on their team, an event coach
// sees athletes in the groups they coach, and an athlete sees only their
// own logs — no manual team/group filtering needed here.
export async function getRecentActivity(limit = 5): Promise<RecentActivityItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_logs")
    .select("id, workout_type, logged_at, profiles(full_name)")
    .order("logged_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    athleteName:
      (row.profiles as unknown as { full_name: string } | null)?.full_name ??
      "Unknown",
    workoutType: row.workout_type as RecentActivityItem["workoutType"],
    loggedAt: row.logged_at,
  }));
}

export async function getLogsTodayCount(): Promise<number> {
  const supabase = await createClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("workout_logs")
    .select("id", { count: "exact", head: true })
    .gte("logged_at", todayStart.toISOString());

  return count ?? 0;
}
