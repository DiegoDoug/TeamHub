import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/current-team";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CycleFormDialog } from "@/components/cycles/cycle-form-dialog";
import { DeleteButton } from "@/components/cycles/delete-button";
import { deleteCycle } from "@/lib/actions/cycles";

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

  const [{ data: group }, team, { data: cycles }] = await Promise.all([
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
      <Link
        href="/dashboard"
        className="text-sm text-muted-foreground underline underline-offset-4"
      >
        ← Back to dashboard
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{group.name}</h1>
          <p className="text-sm text-muted-foreground">Training cycles</p>
        </div>
        {canManage && <CycleFormDialog groupId={groupId} mode="create" />}
      </div>

      {(cycles ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground">No training cycles yet.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(cycles ?? []).map((cycle) => (
          <Card key={cycle.id}>
            <Link href={`/groups/${groupId}/cycles/${cycle.id}`} className="block">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{cycle.name}</span>
                  {cycle.phase && <Badge variant="secondary">{cycle.phase}</Badge>}
                </CardTitle>
                <CardDescription>{formatRange(cycle.start_date, cycle.end_date)}</CardDescription>
              </CardHeader>
            </Link>
            {canManage && (
              <CardFooter className="justify-end gap-1">
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
