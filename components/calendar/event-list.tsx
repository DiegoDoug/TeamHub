"use client";

import { format, parseISO } from "date-fns";
import { MapPin, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  EventFormDialog,
  type CalendarEventRecord,
  type EventGroupOption,
} from "@/components/calendar/event-form-dialog";
import { DeleteEventButton } from "@/components/calendar/delete-event-button";
import { CALENDAR_EVENT_TYPE_LABELS } from "@/lib/validation/calendar";

const TYPE_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  meet: "default",
  practice: "secondary",
  team_meeting: "outline",
  other: "outline",
};

export type CalendarEventWithGroup = CalendarEventRecord & {
  groupName: string | null;
  canManage: boolean;
};

export function EventList({
  eventsByDate,
  groups,
  allowWholeTeam,
}: {
  eventsByDate: { date: string; events: CalendarEventWithGroup[] }[];
  groups: EventGroupOption[];
  allowWholeTeam: boolean;
}) {
  if (eventsByDate.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No events scheduled for this period.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {eventsByDate.map(({ date, events }) => (
        <Card key={date}>
          <CardHeader>
            <CardTitle>{format(parseISO(date), "EEEE, MMMM d")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={TYPE_BADGE_VARIANT[event.type] ?? "outline"}>
                      {CALENDAR_EVENT_TYPE_LABELS[event.type]}
                    </Badge>
                    <span className="font-medium">{event.title}</span>
                    {event.groupName ? (
                      <Badge variant="outline">{event.groupName}</Badge>
                    ) : (
                      <Badge variant="outline">Whole team</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {(event.start_time || event.end_time) && (
                      <span>
                        {event.start_time?.slice(0, 5)}
                        {event.end_time ? ` – ${event.end_time.slice(0, 5)}` : ""}
                      </span>
                    )}
                    {event.location && (
                      <span className="ml-2 inline-flex items-center gap-1">
                        <MapPin className="size-3.5" />
                        {event.location}
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-sm text-muted-foreground">
                      {event.description}
                    </p>
                  )}
                </div>
                {event.canManage && (
                  <div className="flex shrink-0 items-center gap-1">
                    <EventFormDialog
                      trigger={
                        <Button
                          type="button"
                          data-slot="dialog-trigger"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${event.title}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      }
                      groups={groups}
                      allowWholeTeam={allowWholeTeam}
                      event={event}
                    />
                    <DeleteEventButton
                      eventId={event.id}
                      eventTitle={event.title}
                    />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
