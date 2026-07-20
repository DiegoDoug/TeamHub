import { formatDistanceToNowStrict } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { ProfileWorkoutSummary } from "@/lib/queries/profile";

const WORKOUT_TYPE_LABEL: Record<string, string> = {
  distance: "Distance",
  speed: "Speed",
  weights: "Weights",
  technical: "Technical",
};

export function RecentWorkouts({
  workouts,
}: {
  workouts: ProfileWorkoutSummary[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent workouts</CardTitle>
      </CardHeader>
      <CardContent>
        {workouts.length === 0 ? (
          <EmptyState title="No recent workouts" className="py-6" />
        ) : (
          <div className="space-y-0">
            {workouts.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {WORKOUT_TYPE_LABEL[w.workoutType] ?? w.workoutType}
                  </Badge>
                  {w.effortRating !== null && (
                    <span className="text-xs text-muted-foreground">
                      Effort {w.effortRating}/10
                    </span>
                  )}
                </div>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {formatDistanceToNowStrict(new Date(w.loggedAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
