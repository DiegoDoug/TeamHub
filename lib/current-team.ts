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
  const { data } = await supabase
    .from("team_members")
    .select("team_id, role, teams(name)")
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
