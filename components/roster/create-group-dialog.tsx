"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createEventGroup } from "@/lib/actions/roster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const UNASSIGNED = "__unassigned__";

export function CreateGroupDialog({
  eventCoachOptions,
}: {
  eventCoachOptions: { profile_id: string; profiles: { full_name: string } | null }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    const eventCoachId = formData.get("eventCoachId");
    if (eventCoachId === UNASSIGNED) formData.set("eventCoachId", "");

    startTransition(async () => {
      const result = await createEventGroup(null, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success("Event group created");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>New group</Button>} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New event group</DialogTitle>
          <DialogDescription>
            e.g. Sprints, Distance, Jumps, Throws, Multi.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="group-name">Group name</Label>
            <Input id="group-name" name="name" required placeholder="Sprints" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="group-coach">Event coach</Label>
            <Select name="eventCoachId" defaultValue={UNASSIGNED}>
              <SelectTrigger id="group-coach" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {eventCoachOptions.map((m) => (
                  <SelectItem key={m.profile_id} value={m.profile_id}>
                    {m.profiles?.full_name ?? "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
