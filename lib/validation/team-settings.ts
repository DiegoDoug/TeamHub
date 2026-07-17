import { z } from "zod";

export const updateTeamNameSchema = z.object({
  name: z.string().trim().min(2, "Team name must be at least 2 characters"),
});
export type UpdateTeamNameValues = z.infer<typeof updateTeamNameSchema>;
