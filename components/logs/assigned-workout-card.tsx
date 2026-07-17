import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogWorkoutDialog } from "@/components/logs/log-workout-dialog";

const SECTIONS: { key: "warmup" | "drills" | "main_work" | "cooldown" | "notes"; label: string }[] = [
  { key: "warmup", label: "Warmup" },
  { key: "drills", label: "Drills" },
  { key: "main_work", label: "Main work" },
  { key: "cooldown", label: "Cooldown" },
  { key: "notes", label: "Notes" },
];

export function AssignedWorkoutCard({
  trainingDayId,
  groupName,
  cycleName,
  weekNumber,
  warmup,
  drills,
  mainWork,
  cooldown,
  notes,
}: {
  trainingDayId: string;
  groupName: string;
  cycleName: string;
  weekNumber: number;
  warmup: string | null;
  drills: string | null;
  mainWork: string | null;
  cooldown: string | null;
  notes: string | null;
}) {
  const fields = { warmup, drills, main_work: mainWork, cooldown, notes };
  const hasAnyContent = SECTIONS.some((s) => fields[s.key]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{groupName}</CardTitle>
        <CardDescription>
          {cycleName} — Week {weekNumber}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasAnyContent ? (
          <dl className="space-y-2 text-sm">
            {SECTIONS.map(({ key, label }) =>
              fields[key] ? (
                <div key={key}>
                  <dt className="font-medium text-foreground">{label}</dt>
                  <dd className="whitespace-pre-wrap text-muted-foreground">{fields[key]}</dd>
                </div>
              ) : null,
            )}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No workout details entered yet.</p>
        )}
        <LogWorkoutDialog
          trainingDayId={trainingDayId}
          contextLabel={`${groupName} — ${cycleName}, Week ${weekNumber}`}
          triggerLabel="Quick log"
          title="Log this workout"
        />
      </CardContent>
    </Card>
  );
}
