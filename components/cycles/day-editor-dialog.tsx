"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { PencilIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { saveDay } from "@/lib/actions/cycles";

export type Day = {
  id: string;
  warmup: string | null;
  drills: string | null;
  main_work: string | null;
  cooldown: string | null;
  notes: string | null;
};

const FIELDS = [
  { name: "warmup", label: "Warmup" },
  { name: "drills", label: "Drills" },
  { name: "main_work", label: "Main work" },
  { name: "cooldown", label: "Cooldown" },
  { name: "notes", label: "Notes" },
] as const;

// Both "add" and "edit" hit the same saveDay action (an upsert keyed on the
// (week_id, day_of_week) unique constraint) — the only difference is the
// trigger button and whether fields start pre-filled.
export function DayEditorDialog({
  groupId,
  cycleId,
  weekId,
  dayOfWeek,
  label,
  day,
}: {
  groupId: string;
  cycleId: string;
  weekId: string;
  dayOfWeek: number;
  label: string;
  day: Day | null;
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
      const result = await saveDay(null, formData);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      toast.success(`${label}'s workout saved`);
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
          <Button
            type="button"
            data-slot="dialog-trigger"
            variant={day ? "outline" : "secondary"}
            size="sm"
          >
            {day ? <PencilIcon /> : <PlusIcon />}
            {day ? "Edit" : "Add"}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>Plain-text workout plan for this day.</DialogDescription>
          </DialogHeader>

          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="cycle_id" value={cycleId} />
          <input type="hidden" name="week_id" value={weekId} />
          <input type="hidden" name="day_of_week" value={dayOfWeek} />

          {FIELDS.map((field) => (
            <div className="space-y-2" key={field.name}>
              <Label htmlFor={`${uid}-${field.name}`}>{field.label}</Label>
              <Textarea
                id={`${uid}-${field.name}`}
                name={field.name}
                defaultValue={day?.[field.name] ?? ""}
                rows={3}
              />
            </div>
          ))}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save workout"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
