import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AssignedWorkoutCard } from "@/components/logs/assigned-workout-card";
import { LogWorkoutDialog } from "@/components/logs/log-workout-dialog";

type AssignedWorkout = {
  trainingDayId: string;
  groupName: string;
  cycleName: string;
  weekNumber: number;
  warmup: string | null;
  drills: string | null;
  mainWork: string | null;
  cooldown: string | null;
  notes: string | null;
};

// Finds the athlete's assigned workout(s) for today across every event
// group they belong to. "Assigned" = a training_day whose day_of_week
// matches today, reached via that group's training_cycles/weeks, and (when
// the cycle has start/end dates set) whose date range covers today. Cycles
// with no dates set are treated as always-active — see MVP-SPEC.md Feature 4
// and the task brief for why this pragmatic fallback is used instead of a
// strict date-bounded lookup.
async function getTodaysAssignedWorkouts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  athleteId: string,
): Promise<{ hasGroups: boolean; assigned: AssignedWorkout[] }> {
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const todayDow = (now.getDay() + 6) % 7; // JS Sun=0..Sat=6 -> Mon=0..Sun=6

  const { data: memberships } = await supabase
    .from("event_group_members")
    .select("event_group_id")
    .eq("profile_id", athleteId);

  const groupIds = [...new Set((memberships ?? []).map((m) => m.event_group_id))];
  if (groupIds.length === 0) return { hasGroups: false, assigned: [] };

  const { data: groups } = await supabase
    .from("event_groups")
    .select("id, name")
    .in("id", groupIds);
  const groupNameById = new Map((groups ?? []).map((g) => [g.id, g.name]));

  const { data: cycles } = await supabase
    .from("training_cycles")
    .select("id, name, start_date, end_date, event_group_id")
    .in("event_group_id", groupIds);

  const activeCycles = (cycles ?? []).filter((c) => {
    if (c.start_date && todayIso < c.start_date) return false;
    if (c.end_date && todayIso > c.end_date) return false;
    return true;
  });
  if (activeCycles.length === 0) return { hasGroups: true, assigned: [] };

  const cycleIds = activeCycles.map((c) => c.id);
  const cycleById = new Map(activeCycles.map((c) => [c.id, c]));

  const { data: weeks } = await supabase
    .from("training_weeks")
    .select("id, week_number, cycle_id")
    .in("cycle_id", cycleIds);
  if (!weeks || weeks.length === 0) return { hasGroups: true, assigned: [] };

  const weekIds = weeks.map((w) => w.id);
  const weekById = new Map(weeks.map((w) => [w.id, w]));

  const { data: days } = await supabase
    .from("training_days")
    .select("id, warmup, drills, main_work, cooldown, notes, week_id")
    .eq("day_of_week", todayDow)
    .in("week_id", weekIds);

  const assigned: AssignedWorkout[] = (days ?? []).flatMap((day) => {
    const week = weekById.get(day.week_id);
    const cycle = week ? cycleById.get(week.cycle_id) : undefined;
    if (!week || !cycle) return [];
    const groupName = groupNameById.get(cycle.event_group_id) ?? "Group";
    return [
      {
        trainingDayId: day.id,
        groupName,
        cycleName: cycle.name,
        weekNumber: week.week_number,
        warmup: day.warmup,
        drills: day.drills,
        mainWork: day.main_work,
        cooldown: day.cooldown,
        notes: day.notes,
      },
    ];
  });

  return { hasGroups: true, assigned };
}

export default async function LogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { hasGroups, assigned } = await getTodaysAssignedWorkouts(supabase, user.id);
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
          <p className="text-sm text-muted-foreground">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <LogWorkoutDialog
            triggerLabel="Log an extra workout"
            triggerVariant="outline"
            title="Log an extra workout"
            description="Not on your plan? Log it here — it won't be tied to an assigned day."
          />
          <Link
            href="/log/history"
            className="text-sm text-muted-foreground underline underline-offset-4"
          >
            View history →
          </Link>
        </div>
      </div>

      {!hasGroups && (
        <Card>
          <CardHeader>
            <CardTitle>No event group yet</CardTitle>
            <CardDescription>
              You&apos;re not assigned to an event group, so there&apos;s no plan to show. You
              can still log a workout with &quot;Log an extra workout&quot; above.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {hasGroups && assigned.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Nothing assigned today</CardTitle>
            <CardDescription>
              No workout is scheduled for today in your group(s). You can still log a workout
              with &quot;Log an extra workout&quot; above.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {assigned.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {assigned.map((workout) => (
            <AssignedWorkoutCard
              key={workout.trainingDayId}
              trainingDayId={workout.trainingDayId}
              groupName={workout.groupName}
              cycleName={workout.cycleName}
              weekNumber={workout.weekNumber}
              warmup={workout.warmup}
              drills={workout.drills}
              mainWork={workout.mainWork}
              cooldown={workout.cooldown}
              notes={workout.notes}
            />
          ))}
        </div>
      )}
    </div>
  );
}
