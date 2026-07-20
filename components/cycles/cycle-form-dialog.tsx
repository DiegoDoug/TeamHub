"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { PencilIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createCycle, updateCycle } from "@/lib/actions/cycles";
import { PHASE_SUGGESTIONS } from "@/lib/validation/cycles";

type Cycle = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  phase: string | null;
};

export function CycleFormDialog({
  groupId,
  mode,
  cycle,
}: {
  groupId: string;
  mode: "create" | "edit";
  cycle?: Cycle;
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
      const action = mode === "edit" ? updateCycle : createCycle;
      const result = await action(null, formData);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      toast.success(mode === "edit" ? "Cycle updated" : "Cycle created");
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
              New cycle
            </Button>
          ) : (
            <Button
              type="button"
              data-slot="dialog-trigger"
              variant="ghost"
              size="icon-sm"
              aria-label="Edit cycle"
            >
              <PencilIcon className="size-4" />
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{mode === "edit" ? "Edit cycle" : "New training cycle"}</DialogTitle>
            <DialogDescription>
              A cycle groups weeks of training toward a goal, e.g. a season phase.
            </DialogDescription>
          </DialogHeader>

          <input type="hidden" name="group_id" value={groupId} />
          {mode === "edit" && cycle && <input type="hidden" name="id" value={cycle.id} />}

          <div className="space-y-2">
            <Label htmlFor={`${uid}-name`}>Name</Label>
            <Input
              id={`${uid}-name`}
              name="name"
              defaultValue={cycle?.name}
              placeholder="Fall base phase"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`${uid}-start`}>Start date</Label>
              <Input
                id={`${uid}-start`}
                name="start_date"
                type="date"
                defaultValue={cycle?.start_date ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${uid}-end`}>End date</Label>
              <Input
                id={`${uid}-end`}
                name="end_date"
                type="date"
                defaultValue={cycle?.end_date ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${uid}-phase`}>Phase</Label>
            <Input
              id={`${uid}-phase`}
              name="phase"
              list={`${uid}-phase-suggestions`}
              defaultValue={cycle?.phase ?? ""}
              placeholder="base, build, peak, taper…"
            />
            <datalist id={`${uid}-phase-suggestions`}>
              {PHASE_SUGGESTIONS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Create cycle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
