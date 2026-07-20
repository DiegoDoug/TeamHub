"use client";

import { Trash2 } from "lucide-react";
import { deleteCalendarEvent } from "@/lib/actions/calendar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export function DeleteEventButton({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle: string;
}) {
  return (
    <ConfirmDialog
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${eventTitle}`}
        >
          <Trash2 className="size-4" />
        </Button>
      }
      title={`Delete "${eventTitle}"?`}
      description="This can't be undone."
      confirmLabel="Delete"
      successMessage="Event deleted"
      onConfirm={() => deleteCalendarEvent(eventId)}
    />
  );
}
