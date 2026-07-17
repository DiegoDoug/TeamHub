import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Json } from "@/lib/database.types";

const WORKOUT_TYPE_LABEL: Record<string, string> = {
  distance: "Distance",
  speed: "Speed",
  weights: "Weights",
  technical: "Technical",
};

const FIELD_LABEL: Record<string, string> = {
  duration_minutes: "Duration (min)",
  distance_meters: "Distance (m)",
  pace: "Pace",
  splits: "Splits",
  rest: "Rest",
  volume: "Volume",
  drill_quality: "Drill quality",
  coach_feedback: "Coach feedback",
};

function formatDataEntries(data: Json): { label: string; value: string }[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  const record = data as Record<string, Json>;
  const entries: { label: string; value: string }[] = [];

  for (const [key, value] of Object.entries(record)) {
    if (value === null || value === undefined || value === "") continue;
    if (key === "exercises" && Array.isArray(value)) {
      const summary = value
        .map((ex) => {
          if (!ex || typeof ex !== "object" || Array.isArray(ex)) return null;
          const e = ex as Record<string, Json>;
          const parts = [e.sets ? `${e.sets}x` : "", e.reps ? `${e.reps}` : ""].join("");
          const setsReps = parts ? ` (${parts}${e.weight ? ` @ ${e.weight}` : ""})` : e.weight ? ` (${e.weight})` : "";
          return `${e.name ?? "Exercise"}${setsReps}`;
        })
        .filter(Boolean)
        .join(", ");
      if (summary) entries.push({ label: "Exercises", value: summary });
      continue;
    }
    entries.push({ label: FIELD_LABEL[key] ?? key, value: String(value) });
  }

  return entries;
}

export function LogEntryCard({
  workoutType,
  data,
  effortRating,
  notes,
  loggedAt,
  assigned,
}: {
  workoutType: string;
  data: Json;
  effortRating: number | null;
  notes: string | null;
  loggedAt: string;
  assigned: boolean;
}) {
  const dataEntries = formatDataEntries(data);
  const date = new Date(loggedAt);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{WORKOUT_TYPE_LABEL[workoutType] ?? workoutType}</Badge>
            {assigned && <Badge variant="outline">Assigned</Badge>}
            {effortRating !== null && (
              <Badge variant="outline">Effort {effortRating}/10</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {date.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}{" "}
            at {date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
      </CardHeader>
      {(dataEntries.length > 0 || notes) && (
        <CardContent className="space-y-2 text-sm">
          {dataEntries.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
              {dataEntries.map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {notes && <p className="whitespace-pre-wrap text-muted-foreground">{notes}</p>}
        </CardContent>
      )}
    </Card>
  );
}
