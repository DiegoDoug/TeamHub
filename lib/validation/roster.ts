import { z } from "zod";

export const createEventGroupSchema = z.object({
  name: z.string().trim().min(2, "Group name must be at least 2 characters"),
  eventCoachId: z.string().uuid().optional().or(z.literal("")),
});
export type CreateEventGroupValues = z.infer<typeof createEventGroupSchema>;

export const addByEmailSchema = z.object({
  email: z.email("Enter a valid email"),
  role: z.enum(["head_coach", "event_coach", "athlete"]),
});
export type AddByEmailValues = z.infer<typeof addByEmailSchema>;

// ---------------------------------------------------------------------
// Bulk roster import (CSV paste / roster-URL fetch) — see
// lib/actions/roster-import.ts and supabase/db/migrations/201_roster_import.sql.
// ---------------------------------------------------------------------

export const importRosterRowSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required"),
  // Present only when the CSV includes an email column, or the coach fills
  // one in during preview — used to resolve straight to an existing
  // account instead of creating a pending placeholder. Never scraped from
  // a roster URL (public roster pages don't publish emails).
  email: z.email("Enter a valid email").optional().or(z.literal("")),
  groupName: z.string().trim().optional().or(z.literal("")),
  role: z.enum(["athlete", "event_coach"]).default("athlete"),
});
export type ImportRosterRow = z.infer<typeof importRosterRowSchema>;

export const importRosterRowsSchema = z
  .array(importRosterRowSchema)
  .min(1, "Add at least one person")
  .max(300, "Import at most 300 people at a time");

export const importFromUrlSchema = z.object({
  url: z.url("Enter a valid URL"),
});
export type ImportFromUrlValues = z.infer<typeof importFromUrlSchema>;

export const resolvePendingByEmailSchema = z.object({
  email: z.email("Enter a valid email"),
});

export const joinByCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4, "Enter your team's join code")
    .transform((value) => value.toUpperCase()),
});
export type JoinByCodeValues = z.infer<typeof joinByCodeSchema>;
