import "server-only";
import { createClient } from "@/lib/supabase/server";

export type TeamRole = "head_coach" | "event_coach" | "athlete";

export type CurrentTeam = {
  teamId: string;
  teamName: string;
  role: TeamRole;
};

// MVP scope: a user's nav/dashboard is driven by their first (oldest) team
// membership. The schema allows belonging to multiple teams, but the app
// only surfaces one team context at a time.
export async function getCurrentTeam(): Promise<CurrentTeam | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // profiles_select's RLS is team-wide (anyone can see their teammates'
  // rows), so this MUST filter to the caller's own membership row —
  // without `.eq("profile_id", ...)` it silently returns whichever
  // teammate's row happens to be oldest (almost always the head_coach who
  // created the team), handing every other member the head_coach's role.
  const { data } = await supabase
    .from("team_members")
    .select("team_id, role, teams(name)")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    teamId: data.team_id,
    teamName: (data.teams as unknown as { name: string } | null)?.name ?? "",
    role: data.role as TeamRole,
  };
}
