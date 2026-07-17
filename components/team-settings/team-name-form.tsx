"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateTeamName } from "@/lib/actions/team-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TeamNameForm({
  teamId,
  initialName,
}: {
  teamId: string;
  initialName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateTeamName(teamId, null, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success("Team name updated");
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3 max-w-sm">
      <div className="space-y-1.5">
        <Label htmlFor="team-name">Team name</Label>
        <Input id="team-name" name="name" required defaultValue={initialName} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
