import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogEntryCard } from "@/components/logs/log-entry-card";

const HISTORY_LIMIT = 100;

export default async function LogHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS (workout_logs_select) already scopes this to the caller's own rows
  // plus rows their coaches can see; the .eq below keeps this page strictly
  // to "my own logs" regardless.
  const { data: logs } = await supabase
    .from("workout_logs")
    .select("id, workout_type, data, effort_rating, notes, logged_at, training_day_id")
    .eq("athlete_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Log history</h1>
          <p className="text-sm text-muted-foreground">Your past workouts, most recent first</p>
        </div>
        <Link href="/log" className="text-sm text-muted-foreground underline underline-offset-4">
          ← Back to today
        </Link>
      </div>

      {(!logs || logs.length === 0) && (
        <Card>
          <CardHeader>
            <CardTitle>No logs yet</CardTitle>
            <CardDescription>
              Once you log a workout it will show up here.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {logs && logs.length > 0 && (
        <div className="space-y-3">
          {logs.map((log) => (
            <LogEntryCard
              key={log.id}
              workoutType={log.workout_type}
              data={log.data}
              effortRating={log.effort_rating}
              notes={log.notes}
              loggedAt={log.logged_at}
              assigned={log.training_day_id !== null}
            />
          ))}
          {logs.length === HISTORY_LIMIT && (
            <p className="text-center text-xs text-muted-foreground">
              Showing your most recent {HISTORY_LIMIT} logs.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
