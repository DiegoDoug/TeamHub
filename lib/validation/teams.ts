import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().trim().min(2, "Team name must be at least 2 characters"),
});
export type CreateTeamValues = z.infer<typeof createTeamSchema>;
