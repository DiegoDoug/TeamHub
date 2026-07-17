"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCalendarEvent } from "@/lib/actions/calendar";
import { Button } from "@/components/ui/button";

export function DeleteEventButton({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Delete "${eventTitle}"? This can't be undone.`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteCalendarEvent(eventId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Event deleted");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={handleDelete}
      aria-label={`Delete ${eventTitle}`}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
