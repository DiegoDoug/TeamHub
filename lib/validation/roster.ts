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
