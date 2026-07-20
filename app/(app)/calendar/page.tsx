import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  addMonths,
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/current-team";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import {
  EventFormDialog,
  type EventGroupOption,
} from "@/components/calendar/event-form-dialog";
import {
  MonthGrid,
  type CalendarDayCell,
  type CalendarEventWithGroup,
} from "@/components/calendar/month-grid";
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
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const gridStartStr = format(gridStart, "yyyy-MM-dd");
  const gridEndStr = format(gridEnd, "yyyy-MM-dd");
  const prevMonth = format(addMonths(monthStart, -1), "yyyy-MM");
  const nextMonth = format(addMonths(monthStart, 1), "yyyy-MM");
  const currentMonth = format(new Date(), "yyyy-MM");
  const monthStartStr = format(monthStart, "yyyy-MM-dd");
  const defaultDate =
    format(monthStart, "yyyy-MM") === currentMonth
      ? format(new Date(), "yyyy-MM-dd")
      : monthStartStr;

  const canCreate = team.role === "head_coach" || team.role === "event_coach";
  const allowWholeTeam = team.role === "head_coach";

  const [{ data: eventsRaw }, { data: allGroups }] = await Promise.all([
    supabase
      .from("calendar_events")
      .select(
        "id, type, title, description, date, start_time, end_time, location, event_group_id, event_groups(name)",
      )
      .eq("team_id", team.teamId)
      .gte("date", gridStartStr)
      .lte("date", gridEndStr)
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

  const eventsByDate = new Map<string, CalendarEventWithGroup[]>();
  for (const event of events) {
    (eventsByDate.get(event.date) ?? eventsByDate.set(event.date, []).get(event.date)!).push(
      event,
    );
  }

  const days: CalendarDayCell[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) {
    const dateStr = format(d, "yyyy-MM-dd");
    days.push({
      date: dateStr,
      dayOfMonth: d.getDate(),
      inCurrentMonth: isSameMonth(d, monthStart),
      isToday: isToday(d),
      events: eventsByDate.get(dateStr) ?? [],
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description={team.teamName}
        actions={
          canCreate && (
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
          )
        }
      />

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`/calendar?month=${prevMonth}`} />}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <div className="flex items-center gap-2">
          <span className="font-heading text-sm font-bold tracking-tight uppercase">
            {format(monthStart, "MMMM yyyy")}
          </span>
          {monthParam && monthParam !== currentMonth && (
            <Button variant="ghost" size="sm" render={<Link href="/calendar" />}>
              Today
            </Button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`/calendar?month=${nextMonth}`} />}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <MonthGrid
        days={days}
        groups={editableGroups}
        allowWholeTeam={allowWholeTeam}
        canCreate={canCreate}
      />
    </div>
  );
}
