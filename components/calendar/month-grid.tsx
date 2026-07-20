import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfWeek,
} from "date-fns";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  EventFormDialog,
  type EventGroupOption,
} from "@/components/calendar/event-form-dialog";
import type { CalendarEventWithGroup } from "@/components/calendar/event-list";
import { CALENDAR_EVENT_TYPE_LABELS } from "@/lib/validation/calendar";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE_EVENTS = 3;

export function MonthGrid({
  monthStart,
  monthEnd,
  eventsByDate,
  groups,
  allowWholeTeam,
  canCreate,
}: {
  monthStart: Date;
  monthEnd: Date;
  eventsByDate: Record<string, CalendarEventWithGroup[]>;
  groups: EventGroupOption[];
  allowWholeTeam: boolean;
  canCreate: boolean;
}) {
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="grid grid-cols-7 border-b bg-muted/50 text-xs font-medium text-muted-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-1.5 text-center">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDate[dateStr] ?? [];
          const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
          const overflowCount = dayEvents.length - visibleEvents.length;
          const inMonth = isSameMonth(day, monthStart);

          return (
            <div
              key={dateStr}
              className={cn(
                "flex min-h-24 flex-col gap-1 border-b border-r p-1.5 [&:nth-child(7n)]:border-r-0",
                !inMonth && "bg-muted/20",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-xs",
                    !inMonth && "text-muted-foreground/50",
                    isToday(day) &&
                      "bg-primary font-semibold text-primary-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
                {canCreate && (
                  <EventFormDialog
                    trigger={
                      <Button
                        type="button"
                        data-slot="dialog-trigger"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Add event on ${format(day, "EEEE, MMMM d")}`}
                      >
                        <Plus className="size-3" />
                      </Button>
                    }
                    groups={groups}
                    allowWholeTeam={allowWholeTeam}
                    defaultDate={dateStr}
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                {visibleEvents.map((event) =>
                  event.canManage ? (
                    <EventFormDialog
                      key={event.id}
                      trigger={
                        <Button
                          type="button"
                          data-slot="dialog-trigger"
                          variant="secondary"
                          size="xs"
                          className="h-auto w-full justify-start truncate px-1.5 py-0.5 text-left text-[0.7rem] font-normal"
                          aria-label={`Edit ${event.title}`}
                        >
                          <span className="truncate">{event.title}</span>
                        </Button>
                      }
                      groups={groups}
                      allowWholeTeam={allowWholeTeam}
                      event={event}
                    />
                  ) : (
                    <span
                      key={event.id}
                      title={`${CALENDAR_EVENT_TYPE_LABELS[event.type]}: ${event.title}`}
                      className="truncate rounded-md bg-secondary px-1.5 py-0.5 text-[0.7rem] text-secondary-foreground"
                    >
                      {event.title}
                    </span>
                  ),
                )}
                {overflowCount > 0 && (
                  <span className="px-1.5 text-[0.7rem] text-muted-foreground">
                    +{overflowCount} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
