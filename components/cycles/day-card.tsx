import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DayEditorDialog, type Day } from "@/components/cycles/day-editor-dialog";
import { DeleteButton } from "@/components/cycles/delete-button";
import { deleteDay } from "@/lib/actions/cycles";

const FIELDS = [
  { key: "warmup", label: "Warmup" },
  { key: "drills", label: "Drills" },
  { key: "main_work", label: "Main work" },
  { key: "cooldown", label: "Cooldown" },
  { key: "notes", label: "Notes" },
] as const;

// One fixed slot (Mon..Sun) in the week's day grid — either shows the
// existing training_day's plan or a "no workout planned" placeholder.
export function DayCard({
  groupId,
  cycleId,
  weekId,
  dayOfWeek,
  label,
  day,
  canManage,
}: {
  groupId: string;
  cycleId: string;
  weekId: string;
  dayOfWeek: number;
  label: string;
  day: Day | null;
  canManage: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {day ? (
          FIELDS.map((field) =>
            day[field.key] ? (
              <div key={field.key}>
                <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
                <p className="whitespace-pre-wrap text-sm">{day[field.key]}</p>
              </div>
            ) : null,
          )
        ) : (
          <p className="text-sm text-muted-foreground">No workout planned</p>
        )}
      </CardContent>
      {canManage && (
        <CardFooter className="justify-end gap-1">
          <DayEditorDialog
            groupId={groupId}
            cycleId={cycleId}
            weekId={weekId}
            dayOfWeek={dayOfWeek}
            label={label}
            day={day}
          />
          {day && (
            <DeleteButton
              action={deleteDay.bind(null, day.id, groupId, cycleId, weekId)}
              confirmMessage={`Clear ${label}'s workout?`}
              label="Delete workout"
            />
          )}
        </CardFooter>
      )}
    </Card>
  );
}
