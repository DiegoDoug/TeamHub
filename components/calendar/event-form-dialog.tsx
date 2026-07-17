"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createCalendarEvent,
  updateCalendarEvent,
} from "@/lib/actions/calendar";
import {
  CALENDAR_EVENT_TYPES,
  CALENDAR_EVENT_TYPE_LABELS,
  WHOLE_TEAM_VALUE,
  type CalendarEventType,
} from "@/lib/validation/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export type EventGroupOption = { id: string; name: string };

export type CalendarEventRecord = {
  id: string;
  type: CalendarEventType;
  title: string;
  description: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  event_group_id: string | null;
};

type EventFormDialogProps = {
  trigger: React.ReactElement;
  /** Groups this user is allowed to scope the event to. Already filtered by
   * role — e.g. an event_coach only sees the group(s) they coach, and never
   * the "whole team" option. */
  groups: EventGroupOption[];
  /** Whether the "Whole team" option should be offered. */
  allowWholeTeam: boolean;
  event?: CalendarEventRecord;
  defaultDate?: string;
};

export function EventFormDialog({
  trigger,
  groups,
  allowWholeTeam,
  event,
  defaultDate,
}: EventFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const mode = event ? "edit" : "create";

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = event
        ? await updateCalendarEvent(event.id, null, formData)
        : await createCalendarEvent(null, formData);

      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      toast.success(mode === "edit" ? "Event updated" : "Event created");
      setOpen(false);
    });
  }

  const defaultGroupValue = event?.event_group_id ?? (allowWholeTeam
    ? WHOLE_TEAM_VALUE
    : groups[0]?.id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit event" : "New event"}</DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update the details for this calendar event."
              : "Add a practice, meet, or other event to the team calendar."}
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="type">Type</Label>
              <Select name="type" defaultValue={event?.type ?? "practice"}>
                <SelectTrigger id="type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CALENDAR_EVENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {CALENDAR_EVENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={event?.date ?? defaultDate}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              required
              maxLength={200}
              placeholder="Riverside Invitational"
              defaultValue={event?.title}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start_time">Start time</Label>
              <Input
                id="start_time"
                name="start_time"
                type="time"
                defaultValue={event?.start_time ?? undefined}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_time">End time</Label>
              <Input
                id="end_time"
                name="end_time"
                type="time"
                defaultValue={event?.end_time ?? undefined}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              maxLength={200}
              placeholder="Riverside High School Track"
              defaultValue={event?.location ?? undefined}
            />
          </div>

          {(allowWholeTeam || groups.length > 0) && (
            <div className="space-y-1.5">
              <Label htmlFor="event_group_id">Scope</Label>
              <Select name="event_group_id" defaultValue={defaultGroupValue}>
                <SelectTrigger id="event_group_id" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowWholeTeam && (
                    <SelectItem value={WHOLE_TEAM_VALUE}>
                      Whole team
                    </SelectItem>
                  )}
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              maxLength={2000}
              placeholder="Optional details…"
              defaultValue={event?.description ?? undefined}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
