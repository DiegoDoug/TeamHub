"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogForm } from "@/components/logs/log-form";
import type { WorkoutType } from "@/lib/validation/logs";

export function LogWorkoutDialog({
  trainingDayId = null,
  defaultWorkoutType,
  contextLabel,
  triggerLabel,
  triggerVariant = "default",
  title = "Log workout",
  description,
}: {
  trainingDayId?: string | null;
  defaultWorkoutType?: WorkoutType;
  contextLabel?: string;
  triggerLabel: string;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
  title?: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={triggerVariant} size="sm" />}>
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <LogForm
          trainingDayId={trainingDayId}
          defaultWorkoutType={defaultWorkoutType}
          contextLabel={contextLabel}
          onLogged={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
