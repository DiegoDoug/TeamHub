"use client";

import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

// Generic confirm-then-call-server-action delete control shared by cycle,
// week, and day cards. `action` is a server action pre-bound with its ids
// (e.g. `() => deleteCycle(cycle.id, groupId)`).
export function DeleteButton({
  action,
  confirmMessage,
  label,
}: {
  action: () => Promise<{ error: string } | null>;
  confirmMessage: string;
  label: string;
}) {
  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant="ghost" size="icon-sm" aria-label={label}>
          <Trash2Icon className="size-4 text-destructive" />
        </Button>
      }
      title={label}
      description={confirmMessage}
      confirmLabel="Delete"
      onConfirm={action}
    />
  );
}
