"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { PencilIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createWeek, updateWeek } from "@/lib/actions/cycles";

type Week = {
  id: string;
  week_number: number;
  focus: string | null;
  notes: string | null;
};

export function WeekFormDialog({
  groupId,
  cycleId,
  mode,
  week,
  nextWeekNumber,
}: {
  groupId: string;
  cycleId: string;
  mode: "create" | "edit";
  week?: Week;
  nextWeekNumber?: number;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const uid = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const action = mode === "edit" ? updateWeek : createWeek;
      const result = await action(null, formData);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      toast.success(mode === "edit" ? "Week updated" : "Week added");
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger
        render={
          mode === "create" ? (
            <Button data-slot="dialog-trigger" size="sm">
              <PlusIcon />
              Add week
            </Button>
          ) : (
            <Button
              type="button"
              data-slot="dialog-trigger"
              variant="ghost"
              size="icon-sm"
              aria-label="Edit week"
            >
              <PencilIcon className="size-4" />
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{mode === "edit" ? "Edit week" : "Add week"}</DialogTitle>
            <DialogDescription>
              Weeks live inside a cycle; days live inside a week.
            </DialogDescription>
          </DialogHeader>

          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="cycle_id" value={cycleId} />
          {mode === "edit" && week && <input type="hidden" name="id" value={week.id} />}

          <div className="space-y-2">
            <Label htmlFor={`${uid}-week_number`}>Week number</Label>
            <Input
              id={`${uid}-week_number`}
              name="week_number"
              type="number"
              min={1}
              defaultValue={week?.week_number ?? nextWeekNumber ?? 1}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${uid}-focus`}>Focus</Label>
            <Input
              id={`${uid}-focus`}
              name="focus"
              defaultValue={week?.focus ?? ""}
              placeholder="Aerobic base, tempo work…"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${uid}-notes`}>Notes</Label>
            <Textarea
              id={`${uid}-notes`}
              name="notes"
              defaultValue={week?.notes ?? ""}
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Add week"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
