"use client";

import { useActionState } from "react";
import { createTeam, type ActionState } from "@/lib/actions/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateTeamForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createTeam,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Team name</Label>
        <Input id="name" name="name" placeholder="Riverside Track & Field" required />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create team"}
      </Button>
    </form>
  );
}
