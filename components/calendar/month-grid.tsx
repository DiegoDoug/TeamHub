"use client";

import { useState } from "react";
import { PlusIcon, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  EventFormDialog,
  type EventGroupOption,
} from "@/components/calendar/event-form-dialog";
import { DeleteEventButton } from "@/components/calendar/delete-event-button";
import {
  CALENDAR_EVENT_TYPE_LABELS,
  type CalendarEventType,
} from "@/lib/validation/calendar";
import type { CalendarEventRecord } from "@/components/calendar/event-form-dialog";
import { cn } from "@/lib/utils";

export type CalendarEventWithGroup = CalendarEventRecord & {
  groupName: string | null;
  canManage: boolean;
};

export type CalendarDayCell = {
  date: string;
  dayOfMonth: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEventWithGroup[];
};

const TYPE_CHIP_VARIANT: Record<
  CalendarEventType,
  "default" | "secondary" | "outline"
> = {
  meet: "default",
  practice: "secondary",
  team_meeting: "outline",
  other: "outline",
};

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const VISIBLE_LIMIT = 3;

function EventChip({
  event,
  groups,
  allowWholeTeam,
}: {
  event: CalendarEventWithGroup;
  groups: EventGroupOption[];
  allowWholeTeam: boolean;
}) {
  const chip = (
    <button
      type="button"
      data-slot="dialog-trigger"
      className={cn(
        "block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium",
        TYPE_CHIP_VARIANT[event.type] === "default" &&
          "bg-primary text-primary-foreground",
        TYPE_CHIP_VARIANT[event.type] === "secondary" &&
          "bg-secondary text-secondary-foreground",
        TYPE_CHIP_VARIANT[event.type] === "outline" &&
          "border border-border text-foreground",
      )}
    >
      {event.title}
    </button>
  );

  if (!event.canManage) {
    return <div className="pointer-events-none">{chip}</div>;
  }

  return (
    <EventFormDialog
      trigger={chip}
      groups={groups}
      allowWholeTeam={allowWholeTeam}
      event={event}
    />
  );
}

function DayCell({
  day,
  groups,
  allowWholeTeam,
  canCreate,
}: {
  day: CalendarDayCell;
  groups: EventGroupOption[];
  allowWholeTeam: boolean;
  canCreate: boolean;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const visible = day.events.slice(0, VISIBLE_LIMIT);
  const overflow = day.events.slice(VISIBLE_LIMIT);

  return (
    <div
      className={cn(
        "flex min-h-24 flex-col gap-1 border-b border-r border-border p-1.5 sm:min-h-32 sm:p-2",
        !day.inCurrentMonth && "bg-muted/30",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "font-mono text-xs tabular-nums",
            !day.inCurrentMonth && "text-muted-foreground/50",
            day.isToday &&
              "flex size-5 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground",
          )}
        >
          {day.dayOfMonth}
        </span>
        {canCreate && (
          <EventFormDialog
            trigger={
              <Button
                type="button"
                data-slot="dialog-trigger"
                variant="ghost"
                size="icon-xs"
                aria-label={`Add event on ${day.date}`}
                // Expanded tap area capped at the cell's own p-1.5 padding
                // (not larger) so it can't bleed into the neighboring day.
                className="relative opacity-60 after:absolute after:-inset-1.5 hover:opacity-100"
              >
                <PlusIcon className="size-3" />
              </Button>
            }
            groups={groups}
            allowWholeTeam={allowWholeTeam}
            defaultDate={day.date}
          />
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        {visible.map((event) => (
          <EventChip
            key={event.id}
            event={event}
            groups={groups}
            allowWholeTeam={allowWholeTeam}
          />
        ))}
        {overflow.length > 0 && (
          <Popover open={moreOpen} onOpenChange={setMoreOpen}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  data-slot="popover-trigger"
                  className="text-left text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  +{overflow.length} more
                </button>
              }
            />
            <PopoverContent align="start" className="w-64">
              <div className="space-y-2">
                {day.events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-xs"
                  >
                    <div className="min-w-0">
                      <Badge
                        variant={TYPE_CHIP_VARIANT[event.type]}
                        className="mb-1"
                      >
                        {CALENDAR_EVENT_TYPE_LABELS[event.type]}
                      </Badge>
                      <div className="truncate font-medium">{event.title}</div>
                    </div>
                    {event.canManage && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <EventFormDialog
                          trigger={
                            <Button
                              type="button"
                              data-slot="dialog-trigger"
                              variant="ghost"
                              size="icon-xs"
                              aria-label={`Edit ${event.title}`}
                            >
                              <PencilIcon className="size-3" />
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
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

export function MonthGrid({
  days,
  groups,
  allowWholeTeam,
  canCreate,
}: {
  days: CalendarDayCell[];
  groups: EventGroupOption[];
  allowWholeTeam: boolean;
  canCreate: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="grid grid-cols-7 border-t border-l border-border bg-card">
        {DOW_LABELS.map((label) => (
          <div
            key={label}
            className="border-r border-b border-border px-1.5 py-1.5 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase sm:text-xs"
          >
            {label}
          </div>
        ))}
        {days.map((day) => (
          <DayCell
            key={day.date}
            day={day}
            groups={groups}
            allowWholeTeam={allowWholeTeam}
            canCreate={canCreate}
          />
        ))}
      </div>
    </div>
  );
}
