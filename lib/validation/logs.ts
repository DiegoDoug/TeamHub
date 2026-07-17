import { z } from "zod";

// workout_logs.data jsonb shape varies by workout_type — see MVP-SPEC.md
// "Data model" notes. Modeled here as a discriminated union for callers that
// want a typed view of a row's `data` column (e.g. the history page).
export const WORKOUT_TYPES = ["distance", "speed", "weights", "technical"] as const;
export type WorkoutType = (typeof WORKOUT_TYPES)[number];

export type DistanceData = {
  duration_minutes?: number;
  distance_meters?: number;
  pace?: string;
};

export type SpeedData = {
  splits?: string;
  rest?: string;
  volume?: string;
};

export type WeightsExercise = {
  name: string;
  sets?: number;
  reps?: number;
  weight?: string;
};

export type WeightsData = {
  exercises?: WeightsExercise[];
};

export type TechnicalData = {
  drill_quality?: string;
  coach_feedback?: string;
};

export type WorkoutLogData =
  | ({ workout_type: "distance" } & DistanceData)
  | ({ workout_type: "speed" } & SpeedData)
  | ({ workout_type: "weights" } & WeightsData)
  | ({ workout_type: "technical" } & TechnicalData);

const emptyToUndefined = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;

const optionalNumber = z.preprocess(emptyToUndefined, z.coerce.number().optional());
const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());

// Raw <form> field shape posted by components/logs/log-form.tsx. Fields for
// every workout_type are present (all optional) since the client only
// renders the subset relevant to the selected type; buildWorkoutData() below
// picks out the right ones based on workout_type.
export const logFormSchema = z.object({
  workout_type: z.enum(WORKOUT_TYPES, { message: "Select a workout type" }),
  effort_rating: z.coerce
    .number({ message: "Rate your effort" })
    .int()
    .min(1, "Effort must be between 1 and 10")
    .max(10, "Effort must be between 1 and 10"),
  notes: optionalString,
  training_day_id: optionalString,
  // distance
  duration_minutes: optionalNumber,
  distance_meters: optionalNumber,
  pace: optionalString,
  // speed
  splits: optionalString,
  rest: optionalString,
  volume: optionalString,
  // technical
  drill_quality: optionalString,
  coach_feedback: optionalString,
  // weights — JSON-serialized WeightsExercise[] built client-side
  exercises_json: optionalString,
});

export type LogFormValues = z.infer<typeof logFormSchema>;

// Builds the jsonb `data` payload to insert, keyed off workout_type. Empty/
// unset fields are omitted rather than stored as null/empty strings.
export function buildWorkoutData(values: LogFormValues): Record<string, unknown> {
  switch (values.workout_type) {
    case "distance": {
      const data: DistanceData = {};
      if (values.duration_minutes !== undefined) data.duration_minutes = values.duration_minutes;
      if (values.distance_meters !== undefined) data.distance_meters = values.distance_meters;
      if (values.pace) data.pace = values.pace;
      return data;
    }
    case "speed": {
      const data: SpeedData = {};
      if (values.splits) data.splits = values.splits;
      if (values.rest) data.rest = values.rest;
      if (values.volume) data.volume = values.volume;
      return data;
    }
    case "weights": {
      let exercises: WeightsExercise[] = [];
      if (values.exercises_json) {
        try {
          const parsed = JSON.parse(values.exercises_json);
          if (Array.isArray(parsed)) {
            exercises = parsed
              .filter(
                (e): e is { name: string } =>
                  !!e && typeof e.name === "string" && e.name.trim().length > 0,
              )
              .map((e) => {
                const exercise: WeightsExercise = { name: e.name.trim() };
                const sets = Number((e as { sets?: unknown }).sets);
                const reps = Number((e as { reps?: unknown }).reps);
                const weight = (e as { weight?: unknown }).weight;
                if (!Number.isNaN(sets) && (e as { sets?: unknown }).sets !== "" && (e as { sets?: unknown }).sets != null) {
                  exercise.sets = sets;
                }
                if (!Number.isNaN(reps) && (e as { reps?: unknown }).reps !== "" && (e as { reps?: unknown }).reps != null) {
                  exercise.reps = reps;
                }
                if (typeof weight === "string" && weight.trim()) {
                  exercise.weight = weight.trim();
                }
                return exercise;
              });
          }
        } catch {
          // Malformed client payload — treat as no exercises rather than
          // failing the whole submission.
          exercises = [];
        }
      }
      return exercises.length > 0 ? { exercises } : {};
    }
    case "technical": {
      const data: TechnicalData = {};
      if (values.drill_quality) data.drill_quality = values.drill_quality;
      if (values.coach_feedback) data.coach_feedback = values.coach_feedback;
      return data;
    }
  }
}
