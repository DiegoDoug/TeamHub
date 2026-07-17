import { z } from "zod";

export const CALENDAR_EVENT_TYPES = [
  "practice",
  "meet",
  "team_meeting",
  "other",
] as const;
export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export const CALENDAR_EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  practice: "Practice",
  meet: "Meet",
  team_meeting: "Team meeting",
  other: "Other",
};

// Sentinel used by the event-group <select> to mean "whole team" (i.e.
// event_group_id = null), since a native/Base UI select can't submit a real
// null through FormData.
export const WHOLE_TEAM_VALUE = "__whole_team__";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = (max: number, label: string) =>
  z.preprocess(
    emptyToUndefined,
    z.string().trim().max(max, `${label} is too long`).optional(),
  );

const timeField = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Use a valid time")
    .optional(),
);

export const calendarEventSchema = z
  .object({
    type: z.enum(CALENDAR_EVENT_TYPES, { message: "Choose an event type" }),
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title is too long"),
    date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date"),
    start_time: timeField,
    end_time: timeField,
    location: optionalText(200, "Location"),
    description: optionalText(2000, "Description"),
    event_group_id: z.preprocess(
      (value) =>
        value === WHOLE_TEAM_VALUE ? undefined : emptyToUndefined(value),
      z.string().uuid().optional(),
    ),
  })
  .refine(
    (data) =>
      !data.start_time || !data.end_time || data.end_time >= data.start_time,
    { message: "End time must be after start time", path: ["end_time"] },
  );

export type CalendarEventValues = z.infer<typeof calendarEventSchema>;
