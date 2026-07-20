import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { UsersIcon, Layers2Icon, CalendarDaysIcon, ClipboardCheckIcon, ActivityIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/current-team";
import { getTodaysAssignedWorkouts } from "@/lib/queries/logs";
import { getRecentActivity, getLogsTodayCount } from "@/lib/queries/dashboard";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROLE_LABEL: Record<string, string> = {
  head_coach: "Head Coach",
  event_coach: "Event Coach",
  athlete: "Athlete",
};

const WORKOUT_TYPE_LABEL: Record<string, string> = {
  distance: "distance",
  speed: "speed",
  weights: "weights",
  technical: "technical",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const team = await getCurrentTeam();
  if (!team) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toISOString().slice(0, 10);

  const [{ count: rosterCount }, { data: upcomingEvents }, recentActivity, logsToday] =
    await Promise.all([
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
      getRecentActivity(6),
      getLogsTodayCount(),
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

  const todaysWorkouts =
    team.role === "athlete" ? await getTodaysAssignedWorkouts(user!.id) : null;

  return (
    <div>
      <PageHeader
        title={team.teamName}
        description={
          <Badge variant="secondary">{ROLE_LABEL[team.role]}</Badge>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {team.role === "head_coach" && (
          <StatCard label="Roster" value={rosterCount ?? 0} icon={UsersIcon} />
        )}
        <StatCard
          label={team.role === "athlete" ? "My groups" : "Event groups"}
          value={groups.length}
          icon={Layers2Icon}
        />
        <StatCard
          label="Upcoming"
          value={(upcomingEvents ?? []).length}
          icon={CalendarDaysIcon}
        />
        <StatCard
          label="Logged today"
          value={logsToday}
          icon={ClipboardCheckIcon}
          accent={logsToday > 0}
        />
      </div>

      {team.role === "athlete" && todaysWorkouts && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!todaysWorkouts.hasGroups && (
              <EmptyState
                title="No event group yet"
                description="You're not assigned to an event group, so there's no plan to show."
              />
            )}
            {todaysWorkouts.hasGroups && todaysWorkouts.assigned.length === 0 && (
              <EmptyState
                title="Nothing assigned today"
                description="No workout is scheduled for today in your group(s)."
              />
            )}
            {todaysWorkouts.assigned.map((w) => (
              <div
                key={w.trainingDayId}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div className="font-medium">
                  {w.groupName} — {w.cycleName}, Week {w.weekNumber}
                </div>
                {w.mainWork && (
                  <div className="mt-1 text-muted-foreground">{w.mainWork}</div>
                )}
              </div>
            ))}
            <Link
              href="/log"
              className="block text-sm underline underline-offset-4"
            >
              Go to today&apos;s log →
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <EmptyState icon={ActivityIcon} title="No activity yet" />
            ) : (
              <div className="space-y-0">
                {recentActivity.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0 last:pb-0"
                  >
                    <span>
                      <span className="font-medium">{a.athleteName}</span> logged a{" "}
                      {WORKOUT_TYPE_LABEL[a.workoutType]} workout
                    </span>
                    <span className="shrink-0 pl-3 font-mono text-xs text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(a.loggedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {team.role === "athlete" ? "My Groups" : "Event Groups"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <EmptyState title="No groups yet" />
            ) : (
              <div className="space-y-1">
                {groups.map((g) => (
                  <Link
                    key={g.id}
                    href={`/groups/${g.id}/cycles`}
                    className="block text-sm underline underline-offset-4"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(upcomingEvents ?? []).length === 0 && (
            <EmptyState title="Nothing scheduled yet" />
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
          <Link
            href="/calendar"
            className="block text-sm underline underline-offset-4"
          >
            View calendar →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
