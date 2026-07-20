import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/current-team";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { WeekFormDialog } from "@/components/cycles/week-form-dialog";
import { DeleteButton } from "@/components/cycles/delete-button";
import { deleteWeek } from "@/lib/actions/cycles";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ groupId: string; cycleId: string }>;
}) {
  const { groupId, cycleId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: group }, { data: cycle }, { data: weeks }, team] = await Promise.all([
    supabase
      .from("event_groups")
      .select("id, name, event_coach_id")
      .eq("id", groupId)
      .maybeSingle(),
    supabase
      .from("training_cycles")
      .select("id, name, start_date, end_date, phase, event_group_id")
      .eq("id", cycleId)
      .eq("event_group_id", groupId)
      .maybeSingle(),
    supabase
      .from("training_weeks")
      .select("id, week_number, focus, notes")
      .eq("cycle_id", cycleId)
      .order("week_number", { ascending: true }),
    getCurrentTeam(),
  ]);

  // Either the group is invisible under RLS, or the cycle doesn't belong to
  // this group (wrong URL) — both are a 404 from the caller's perspective.
  if (!group || !cycle) notFound();

  const canManage =
    !!team &&
    (team.role === "head_coach" ||
      (team.role === "event_coach" && group.event_coach_id === user?.id));

  const nextWeekNumber = (weeks ?? []).reduce((max, w) => Math.max(max, w.week_number), 0) + 1;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: group.name, href: `/groups/${groupId}/cycles` },
          { label: cycle.name },
        ]}
        title={cycle.name}
        description={`${group.name}${cycle.phase ? ` · ${cycle.phase}` : ""}`}
        actions={
          canManage && (
            <WeekFormDialog
              groupId={groupId}
              cycleId={cycleId}
              mode="create"
              nextWeekNumber={nextWeekNumber}
            />
          )
        }
      />

      {(weeks ?? []).length === 0 && (
        <EmptyState
          title="No weeks yet."
          description={canManage ? "Add a week to start planning." : undefined}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(weeks ?? []).map((week) => (
          <Card key={week.id}>
            <Link
              href={`/groups/${groupId}/cycles/${cycleId}/weeks/${week.id}`}
              className="block rounded-t-xl transition-colors hover:bg-muted/50"
            >
              <CardHeader>
                <CardTitle>Week {week.week_number}</CardTitle>
                {week.focus && <CardDescription>{week.focus}</CardDescription>}
              </CardHeader>
              {week.notes && (
                <CardContent>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{week.notes}</p>
                </CardContent>
              )}
            </Link>
            {canManage && (
              <CardFooter className="justify-end gap-2">
                <WeekFormDialog groupId={groupId} cycleId={cycleId} mode="edit" week={week} />
                <DeleteButton
                  action={deleteWeek.bind(null, week.id, groupId, cycleId)}
                  confirmMessage={`Delete week ${week.week_number}? This removes all its days.`}
                  label="Delete week"
                />
              </CardFooter>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
