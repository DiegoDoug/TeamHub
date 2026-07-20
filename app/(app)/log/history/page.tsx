import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogEntryCard } from "@/components/logs/log-entry-card";
import { LogHistoryFilters } from "@/components/logs/log-history-filters";
import { EmptyState } from "@/components/shared/empty-state";

const HISTORY_LIMIT = 100;

export default async function LogHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; from?: string; to?: string }>;
}) {
  const { type, from, to } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS (workout_logs_select) already scopes this to the caller's own rows
  // plus rows their coaches can see; the .eq below keeps this page strictly
  // to "my own logs" regardless.
  let query = supabase
    .from("workout_logs")
    .select("id, workout_type, data, effort_rating, notes, logged_at, training_day_id")
    .eq("athlete_id", user.id);

  if (type) query = query.eq("workout_type", type);
  if (from) query = query.gte("logged_at", `${from}T00:00:00`);
  if (to) query = query.lte("logged_at", `${to}T23:59:59`);

  const { data: logs } = await query
    .order("logged_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  const hasFilters = !!(type || from || to);

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

      <LogHistoryFilters type={type} from={from} to={to} />

      {(!logs || logs.length === 0) && (
        <EmptyState
          title={hasFilters ? "No logs match these filters" : "No logs yet"}
          description={
            hasFilters
              ? "Try widening the date range or clearing the type filter."
              : "Once you log a workout it will show up here."
          }
        />
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
