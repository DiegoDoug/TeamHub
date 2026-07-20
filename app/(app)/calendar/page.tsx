import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { addMonths, endOfMonth, format, parse, startOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/current-team";
import { Button } from "@/components/ui/button";
import {
  EventFormDialog,
  type EventGroupOption,
} from "@/components/calendar/event-form-dialog";
import {
  EventList,
  type CalendarEventWithGroup,
} from "@/components/calendar/event-list";
import { MonthGrid } from "@/components/calendar/month-grid";
import type { CalendarEventType } from "@/lib/validation/calendar";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;

  const team = await getCurrentTeam();
  if (!team) redirect("/onboarding");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const anchor =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? parse(monthParam, "yyyy-MM", new Date())
      : new Date();
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const monthStartStr = format(monthStart, "yyyy-MM-dd");
  const monthEndStr = format(monthEnd, "yyyy-MM-dd");
  const prevMonth = format(addMonths(monthStart, -1), "yyyy-MM");
  const nextMonth = format(addMonths(monthStart, 1), "yyyy-MM");

  const canCreate = team.role === "head_coach" || team.role === "event_coach";
  const allowWholeTeam = team.role === "head_coach";

  const [{ data: eventsRaw }, { data: allGroups }] = await Promise.all([
    supabase
      .from("calendar_events")
      .select(
        "id, type, title, description, date, start_time, end_time, location, event_group_id, event_groups(name)",
      )
      .eq("team_id", team.teamId)
      .gte("date", monthStartStr)
      .lte("date", monthEndStr)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: true }),
    canCreate
      ? supabase
          .from("event_groups")
          .select("id, name, event_coach_id")
          .eq("team_id", team.teamId)
          .order("name")
      : Promise.resolve({
          data: [] as { id: string; name: string; event_coach_id: string | null }[],
        }),
  ]);

  const editableGroups: EventGroupOption[] =
    team.role === "head_coach"
      ? (allGroups ?? []).map((g) => ({ id: g.id, name: g.name }))
      : team.role === "event_coach"
        ? (allGroups ?? [])
            .filter((g) => g.event_coach_id === user.id)
            .map((g) => ({ id: g.id, name: g.name }))
        : [];

  const myGroupIds = new Set(editableGroups.map((g) => g.id));

  const events: CalendarEventWithGroup[] = (eventsRaw ?? []).map((e) => {
    const groupName =
      (e.event_groups as unknown as { name: string } | null)?.name ?? null;
    const canManage =
      team.role === "head_coach" ||
      (team.role === "event_coach" &&
        e.event_group_id !== null &&
        myGroupIds.has(e.event_group_id));
    return {
      id: e.id,
      type: e.type as CalendarEventType,
      title: e.title,
      description: e.description,
      date: e.date,
      start_time: e.start_time,
      end_time: e.end_time,
      location: e.location,
      event_group_id: e.event_group_id,
      groupName,
      canManage,
    };
  });

  const eventsByDateMap = events.reduce<Record<string, CalendarEventWithGroup[]>>(
    (acc, event) => {
      (acc[event.date] ??= []).push(event);
      return acc;
    },
    {},
  );

  const eventsByDate = Object.entries(eventsByDateMap)
    .map(([date, dateEvents]) => ({ date, events: dateEvents }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const isCurrentMonth =
    format(new Date(), "yyyy-MM") === format(monthStart, "yyyy-MM");
  const defaultDate = isCurrentMonth
    ? format(new Date(), "yyyy-MM-dd")
    : monthStartStr;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">{team.teamName}</p>
        </div>
        {canCreate && (
          <EventFormDialog
            trigger={
              <Button type="button" data-slot="dialog-trigger">
                <Plus className="size-4" />
                New event
              </Button>
            }
            groups={editableGroups}
            allowWholeTeam={allowWholeTeam}
            defaultDate={defaultDate}
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/calendar?month=${prevMonth}`} />}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <span className="text-sm font-medium">
          {format(monthStart, "MMMM yyyy")}
        </span>
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/calendar?month=${nextMonth}`} />}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <MonthGrid
        monthStart={monthStart}
        monthEnd={monthEnd}
        eventsByDate={eventsByDateMap}
        groups={editableGroups}
        allowWholeTeam={allowWholeTeam}
        canCreate={canCreate}
      />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Agenda</h2>
        <EventList
          eventsByDate={eventsByDate}
          groups={editableGroups}
          allowWholeTeam={allowWholeTeam}
        />
      </div>
    </div>
  );
}
