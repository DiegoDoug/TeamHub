import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/current-team";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CycleFormDialog } from "@/components/cycles/cycle-form-dialog";
import { DeleteButton } from "@/components/cycles/delete-button";
import { deleteCycle } from "@/lib/actions/cycles";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentWeekForGroup } from "@/lib/queries/cycles";
import { CalendarClockIcon } from "lucide-react";

function formatRange(start: string | null, end: string | null) {
  if (!start && !end) return "No dates set";
  if (start && end) return `${start} – ${end}`;
  return start ? `From ${start}` : `Until ${end}`;
}

export default async function CyclesPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: group }, team, { data: cycles }, currentWeek] = await Promise.all([
    supabase
      .from("event_groups")
      .select("id, name, event_coach_id")
      .eq("id", groupId)
      .maybeSingle(),
    getCurrentTeam(),
    supabase
      .from("training_cycles")
      .select("id, name, start_date, end_date, phase")
      .eq("event_group_id", groupId)
      .order("start_date", { ascending: true, nullsFirst: false }),
    getCurrentWeekForGroup(groupId),
  ]);

  // RLS returns no row if the caller can't see this group at all (wrong
  // team, or a group they have no relationship to).
  if (!group) notFound();

  const canManage =
    !!team &&
    (team.role === "head_coach" ||
      (team.role === "event_coach" && group.event_coach_id === user?.id));

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: group.name }]}
        title={group.name}
        description="Training cycles"
        actions={canManage && <CycleFormDialog groupId={groupId} mode="create" />}
      />

      {currentWeek && (
        <Link
          href={`/groups/${groupId}/cycles/${currentWeek.cycleId}/weeks/${currentWeek.weekId}`}
          className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10"
        >
          <CalendarClockIcon className="size-4" />
          This week: {currentWeek.cycleName} — Week {currentWeek.weekNumber}
          <span className="ml-auto">→</span>
        </Link>
      )}

      {(cycles ?? []).length === 0 && (
        <EmptyState
          title="No training cycles yet."
          description={canManage ? "Create one to start planning workouts." : undefined}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(cycles ?? []).map((cycle) => (
          <Card key={cycle.id}>
            <Link
              href={`/groups/${groupId}/cycles/${cycle.id}`}
              className="block rounded-t-xl transition-colors hover:bg-muted/50"
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{cycle.name}</span>
                  {cycle.phase && <Badge variant="secondary">{cycle.phase}</Badge>}
                </CardTitle>
                <CardDescription>{formatRange(cycle.start_date, cycle.end_date)}</CardDescription>
              </CardHeader>
            </Link>
            {canManage && (
              <CardFooter className="justify-end gap-2">
                <CycleFormDialog groupId={groupId} mode="edit" cycle={cycle} />
                <DeleteButton
                  action={deleteCycle.bind(null, cycle.id, groupId)}
                  confirmMessage={`Delete cycle "${cycle.name}"? This removes all its weeks and days.`}
                  label="Delete cycle"
                />
              </CardFooter>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
