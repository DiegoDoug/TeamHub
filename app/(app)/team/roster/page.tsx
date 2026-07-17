import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/current-team";
import { CreateGroupDialog } from "@/components/roster/create-group-dialog";
import { AddMemberDialog } from "@/components/roster/add-member-dialog";
import { GroupCard } from "@/components/roster/group-card";
import { MemberRow } from "@/components/roster/member-row";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function RosterPage() {
  const team = await getCurrentTeam();
  if (!team) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: teamMembers }, { data: eventGroups }] = await Promise.all([
    supabase
      .from("team_members")
      .select("id, role, profile_id, profiles(id, full_name, email)")
      .eq("team_id", team.teamId)
      .order("created_at", { ascending: true }),
    supabase
      .from("event_groups")
      .select("id, name, event_coach_id")
      .eq("team_id", team.teamId)
      .order("created_at", { ascending: true }),
  ]);

  const members = (teamMembers ?? []) as unknown as {
    id: string;
    role: "head_coach" | "event_coach" | "athlete";
    profile_id: string;
    profiles: { id: string; full_name: string; email: string } | null;
  }[];
  const groups = eventGroups ?? [];

  const groupIds = groups.map((g) => g.id);
  const { data: groupMembersRaw } =
    groupIds.length > 0
      ? await supabase
          .from("event_group_members")
          .select("event_group_id, profile_id, profiles(id, full_name, email)")
          .in("event_group_id", groupIds)
      : { data: [] as never[] };

  const groupMembers = (groupMembersRaw ?? []) as unknown as {
    event_group_id: string;
    profile_id: string;
    profiles: { id: string; full_name: string; email: string } | null;
  }[];

  const eventCoachOptions = members.filter((m) => m.role === "event_coach");
  const athletes = members.filter((m) => m.role === "athlete");

  const isHeadCoach = team.role === "head_coach";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roster</h1>
          <p className="text-sm text-muted-foreground">{team.teamName}</p>
        </div>
        {isHeadCoach && (
          <div className="flex gap-2">
            <AddMemberDialog />
            <CreateGroupDialog eventCoachOptions={eventCoachOptions} />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Event groups</h2>
        {groups.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No event groups yet.
            {isHeadCoach && " Create one to start organizing athletes."}
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group) => {
            const coach = members.find((m) => m.profile_id === group.event_coach_id);
            const memberList = groupMembers.filter(
              (gm) => gm.event_group_id === group.id,
            );
            const canManage =
              isHeadCoach ||
              (team.role === "event_coach" && group.event_coach_id === user?.id);
            const memberIds = new Set(memberList.map((m) => m.profile_id));
            const availableAthletes = athletes.filter(
              (a) => !memberIds.has(a.profile_id),
            );
            return (
              <GroupCard
                key={group.id}
                groupId={group.id}
                groupName={group.name}
                coachName={coach?.profiles?.full_name ?? null}
                members={memberList.map((m) => ({
                  profileId: m.profile_id,
                  name: m.profiles?.full_name ?? "Unknown",
                }))}
                availableAthletes={availableAthletes.map((a) => ({
                  profileId: a.profile_id,
                  name: a.profiles?.full_name ?? "Unknown",
                }))}
                canManage={canManage}
              />
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Team members</h2>
        <Card>
          <CardHeader>
            <CardTitle>All members</CardTitle>
            <CardDescription>{members.length} people on the team</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  {isHeadCoach && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <MemberRow
                    key={m.id}
                    teamMemberId={m.id}
                    name={m.profiles?.full_name ?? "Unknown"}
                    email={m.profiles?.email ?? ""}
                    role={m.role}
                    canManage={isHeadCoach}
                    isSelf={m.profile_id === user?.id}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
