import { z } from "zod";

// Shared preprocessor: empty-string form fields become `undefined` so
// `.optional()` (rather than a "" value) flows through to the DB as null.
const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().optional());
const optionalDate = z.preprocess(emptyToUndefined, z.string().optional());

export const cycleFormSchema = z.object({
  group_id: z.uuid(),
  name: z.string().trim().min(2, "Cycle name must be at least 2 characters"),
  start_date: optionalDate,
  end_date: optionalDate,
  phase: optionalText,
});
export type CycleFormValues = z.infer<typeof cycleFormSchema>;

export const cycleUpdateSchema = cycleFormSchema.extend({
  id: z.uuid(),
});
export type CycleUpdateValues = z.infer<typeof cycleUpdateSchema>;

export const weekFormSchema = z.object({
  group_id: z.uuid(),
  cycle_id: z.uuid(),
  week_number: z.coerce.number().int().min(1, "Week number must be at least 1"),
  focus: optionalText,
  notes: optionalText,
});
export type WeekFormValues = z.infer<typeof weekFormSchema>;

export const weekUpdateSchema = weekFormSchema.extend({
  id: z.uuid(),
});
export type WeekUpdateValues = z.infer<typeof weekUpdateSchema>;

export const dayFormSchema = z.object({
  group_id: z.uuid(),
  cycle_id: z.uuid(),
  week_id: z.uuid(),
  day_of_week: z.coerce.number().int().min(0).max(6),
  warmup: optionalText,
  drills: optionalText,
  main_work: optionalText,
  cooldown: optionalText,
  notes: optionalText,
});
export type DayFormValues = z.infer<typeof dayFormSchema>;

export const PHASE_SUGGESTIONS = ["base", "build", "peak", "taper"] as const;

export const DAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;
