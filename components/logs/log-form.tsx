"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { logWorkout, type LogActionState } from "@/lib/actions/logs";
import { WORKOUT_TYPES, type WorkoutType } from "@/lib/validation/logs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";

const WORKOUT_TYPE_LABEL: Record<WorkoutType, string> = {
  distance: "Distance",
  speed: "Speed",
  weights: "Weights",
  technical: "Technical",
};

type ExerciseRow = { name: string; sets: string; reps: string; weight: string };

const emptyExercise = (): ExerciseRow => ({ name: "", sets: "", reps: "", weight: "" });

export function LogForm({
  trainingDayId = null,
  defaultWorkoutType,
  contextLabel,
  onLogged,
}: {
  trainingDayId?: string | null;
  defaultWorkoutType?: WorkoutType;
  contextLabel?: string;
  onLogged?: () => void;
}) {
  const [state, formAction, pending] = useActionState<LogActionState, FormData>(
    logWorkout,
    null,
  );
  // Controlled from the very first render (never `undefined`) — Base UI
  // warns if a Select's `value` switches between uncontrolled and
  // controlled across renders, which an initial `undefined` here would do
  // as soon as the user picks a type.
  const [workoutType, setWorkoutType] = useState<WorkoutType | "">(
    defaultWorkoutType ?? "",
  );
  const [exercises, setExercises] = useState<ExerciseRow[]>([emptyExercise()]);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("Workout logged");
      onLogged?.();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
    // Only fire when a fresh state comes back from the action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function updateExercise(index: number, field: keyof ExerciseRow, value: string) {
    setExercises((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  function addExercise() {
    setExercises((rows) => [...rows, emptyExercise()]);
  }

  function removeExercise(index: number) {
    setExercises((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows));
  }

  return (
    <form action={formAction} className="space-y-4">
      {trainingDayId && (
        <input type="hidden" name="training_day_id" value={trainingDayId} />
      )}
      {contextLabel && <p className="text-sm text-muted-foreground">{contextLabel}</p>}

      <div className="space-y-2">
        <Label htmlFor="workout_type">Workout type</Label>
        <Select
          name="workout_type"
          required
          value={workoutType}
          onValueChange={(value) => setWorkoutType((value as WorkoutType) ?? "")}
        >
          <SelectTrigger id="workout_type" className="w-full">
            <SelectValue placeholder="Select a type" />
          </SelectTrigger>
          <SelectContent>
            {WORKOUT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {WORKOUT_TYPE_LABEL[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {workoutType === "distance" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="duration_minutes">Duration (min)</Label>
            <Input id="duration_minutes" name="duration_minutes" type="number" min={0} step="any" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="distance_meters">Distance (m)</Label>
            <Input id="distance_meters" name="distance_meters" type="number" min={0} step="any" />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="pace">Pace</Label>
            <Input id="pace" name="pace" placeholder="e.g. 6:30/mi" />
          </div>
        </div>
      )}

      {workoutType === "speed" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="splits">Splits</Label>
            <Input id="splits" name="splits" placeholder="e.g. 4x200m" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rest">Rest</Label>
            <Input id="rest" name="rest" placeholder="e.g. 90s between reps" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="volume">Volume</Label>
            <Input id="volume" name="volume" placeholder="e.g. 1200m total" />
          </div>
        </div>
      )}

      {workoutType === "weights" && (
        <div className="space-y-2">
          <Label>Exercises</Label>
          <div className="space-y-2">
            {exercises.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_3.5rem_3.5rem_4.5rem_auto] items-center gap-1.5">
                <Input
                  aria-label="Exercise name"
                  placeholder="Exercise"
                  value={row.name}
                  onChange={(e) => updateExercise(i, "name", e.target.value)}
                />
                <Input
                  aria-label="Sets"
                  placeholder="Sets"
                  type="number"
                  min={0}
                  value={row.sets}
                  onChange={(e) => updateExercise(i, "sets", e.target.value)}
                />
                <Input
                  aria-label="Reps"
                  placeholder="Reps"
                  type="number"
                  min={0}
                  value={row.reps}
                  onChange={(e) => updateExercise(i, "reps", e.target.value)}
                />
                <Input
                  aria-label="Weight"
                  placeholder="Weight"
                  value={row.weight}
                  onChange={(e) => updateExercise(i, "weight", e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeExercise(i)}
                  aria-label="Remove exercise"
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addExercise}>
            + Add exercise
          </Button>
          <input type="hidden" name="exercises_json" value={JSON.stringify(exercises)} />
        </div>
      )}

      {workoutType === "technical" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="drill_quality">Drill quality</Label>
            <Input id="drill_quality" name="drill_quality" placeholder="e.g. sharp, needs work" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coach_feedback">Coach feedback</Label>
            <Textarea id="coach_feedback" name="coach_feedback" rows={2} />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="effort_rating">Effort (1–10)</Label>
        <Input
          id="effort_rating"
          name="effort_rating"
          type="number"
          min={1}
          max={10}
          defaultValue={5}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} placeholder="Optional" />
      </div>

      {state && "error" in state && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" className="w-full" disabled={pending || !workoutType}>
        {pending ? "Logging…" : "Log workout"}
      </Button>
    </form>
  );
}
