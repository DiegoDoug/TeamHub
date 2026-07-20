import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AssignedWorkoutCard } from "@/components/logs/assigned-workout-card";
import { LogWorkoutDialog } from "@/components/logs/log-workout-dialog";
import { getTodaysAssignedWorkouts } from "@/lib/queries/logs";

export default async function LogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { hasGroups, assigned } = await getTodaysAssignedWorkouts(user.id);
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
