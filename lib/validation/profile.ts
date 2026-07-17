import { z } from "zod";

export const prEntrySchema = z.object({
  event: z.string().trim().min(1, "Event name is required"),
  mark: z.string().trim().min(1, "Mark is required"),
  date: z.string().trim().optional(),
});

export const updateProfileSchema = z.object({
  full_name: z.string().trim().min(1, "Enter your name"),
  primary_events: z
    .string()
    .trim()
    .max(500, "Keep primary events under 500 characters"),
  prs: z.array(prEntrySchema).max(50, "Too many PRs"),
});

export type PrEntry = z.infer<typeof prEntrySchema>;
export type UpdateProfileValues = z.infer<typeof updateProfileSchema>;
