import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/current-team";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ROLE_LABEL: Record<string, string> = {
  head_coach: "Head Coach",
  event_coach: "Event Coach",
  athlete: "Athlete",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const team = await getCurrentTeam();
  if (!team) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toISOString().slice(0, 10);

  const [{ count: rosterCount }, { data: upcomingEvents }] = await Promise.all([
    supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", team.teamId),
    supabase
      .from("calendar_events")
      .select("id, title, type, date, start_time, location")
      .eq("team_id", team.teamId)
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(5),
  ]);

  const groupsQuery =
    team.role === "head_coach"
      ? supabase.from("event_groups").select("id, name").eq("team_id", team.teamId)
      : team.role === "event_coach"
        ? supabase
            .from("event_groups")
            .select("id, name")
            .eq("team_id", team.teamId)
            .eq("event_coach_id", user!.id)
        : supabase
            .from("event_group_members")
            .select("event_groups(id, name)")
            .eq("profile_id", user!.id);

  const { data: groupsRaw } = await groupsQuery;
  const groups =
    team.role === "athlete"
      ? ((groupsRaw ?? []) as unknown as { event_groups: { id: string; name: string } }[])
          .map((r) => r.event_groups)
          .filter(Boolean)
      : ((groupsRaw ?? []) as unknown as { id: string; name: string }[]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{team.teamName}</h1>
          <Badge variant="secondary" className="mt-1">
            {ROLE_LABEL[team.role]}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {team.role === "athlete" && (
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Today</CardTitle>
              <CardDescription>Your assigned workouts</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/log" className="text-sm underline underline-offset-4">
                Go to today&apos;s log →
              </Link>
            </CardContent>
          </Card>
        )}

        {team.role === "head_coach" && (
          <Card>
            <CardHeader>
              <CardTitle>Roster</CardTitle>
              <CardDescription>{rosterCount ?? 0} team members</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/team/roster" className="text-sm underline underline-offset-4">
                Manage roster →
              </Link>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              {team.role === "athlete" ? "My Groups" : "Event Groups"}
            </CardTitle>
            <CardDescription>
              {groups.length === 0 ? "No groups yet" : `${groups.length} group(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}/cycles`}
                className="block text-sm underline underline-offset-4"
              >
                {g.name}
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
            <CardDescription>Next practices &amp; meets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(upcomingEvents ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>
            )}
            {(upcomingEvents ?? []).map((e) => (
              <div key={e.id} className="text-sm">
                <span className="font-medium">{e.title}</span>{" "}
                <span className="text-muted-foreground">
                  — {e.date}
                  {e.start_time ? ` ${e.start_time}` : ""}
                </span>
              </div>
            ))}
            <Link href="/calendar" className="block text-sm underline underline-offset-4">
              View calendar →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
