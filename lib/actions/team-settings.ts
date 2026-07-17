"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateTeamNameSchema } from "@/lib/validation/team-settings";

export type ActionState = { error: string; success?: never } | { success: true; error?: never } | null;

export async function updateTeamName(
  teamId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateTeamNameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ name: parsed.data.name })
    .eq("id", teamId);

  if (error) return { error: error.message };

  revalidatePath("/team/settings");
  revalidatePath("/dashboard");
  return { success: true };
}
