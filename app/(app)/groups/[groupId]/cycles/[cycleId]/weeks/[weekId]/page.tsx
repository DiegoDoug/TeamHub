import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/current-team";
import { DayCard } from "@/components/cycles/day-card";
import { DAY_LABELS } from "@/lib/validation/cycles";
import { PageHeader } from "@/components/shared/page-header";
import { CopyWeekForwardButton } from "@/components/cycles/copy-week-forward-button";
import { getCurrentWeekForGroup } from "@/lib/queries/cycles";

export default async function WeekDaysPage({
  params,
}: {
  params: Promise<{ groupId: string; cycleId: string; weekId: string }>;
}) {
  const { groupId, cycleId, weekId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: group }, { data: cycle }, { data: week }, { data: days }, team, currentWeek] =
    await Promise.all([
      supabase
        .from("event_groups")
        .select("id, name, event_coach_id")
        .eq("id", groupId)
        .maybeSingle(),
      supabase
        .from("training_cycles")
        .select("id, name, event_group_id")
        .eq("id", cycleId)
        .eq("event_group_id", groupId)
        .maybeSingle(),
      supabase
        .from("training_weeks")
        .select("id, week_number, focus, notes, cycle_id")
        .eq("id", weekId)
        .eq("cycle_id", cycleId)
        .maybeSingle(),
      supabase
        .from("training_days")
        .select("id, day_of_week, warmup, drills, main_work, cooldown, notes")
        .eq("week_id", weekId),
      getCurrentTeam(),
      getCurrentWeekForGroup(groupId),
    ]);

  // Any broken link in the group -> cycle -> week chain (wrong ids, or RLS
  // hiding the group) is a 404 from the caller's perspective.
  if (!group || !cycle || !week) notFound();

  const canManage =
    !!team &&
    (team.role === "head_coach" ||
      (team.role === "event_coach" && group.event_coach_id === user?.id));

  const daysByDow = new Map((days ?? []).map((d) => [d.day_of_week, d]));
  // Only highlight a "Today" day slot when this is actually the week
  // containing today — training_days are keyed by day_of_week with no real
  // date, so without this check every week (past or future) would show a
  // "Today" badge on whichever slot matches today's weekday.
  const isViewingCurrentWeek = currentWeek?.weekId === weekId;
  const todayDow = (new Date().getDay() + 6) % 7; // JS Sun=0..Sat=6 -> Mon=0..Sun=6

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: group.name, href: `/groups/${groupId}/cycles` },
          { label: cycle.name, href: `/groups/${groupId}/cycles/${cycleId}` },
          { label: `Week ${week.week_number}` },
        ]}
        title={`Week ${week.week_number}${week.focus ? ` — ${week.focus}` : ""}`}
        description={
          <>
            {cycle.name}
            {week.notes && <span className="block">{week.notes}</span>}
          </>
        }
        actions={
          canManage && (
            <CopyWeekForwardButton
              weekId={weekId}
              groupId={groupId}
              cycleId={cycleId}
              weekNumber={week.week_number}
            />
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {DAY_LABELS.map((label, dow) => (
          <DayCard
            key={dow}
            groupId={groupId}
            cycleId={cycleId}
            weekId={weekId}
            dayOfWeek={dow}
            label={label}
            day={daysByDow.get(dow) ?? null}
            canManage={canManage}
            isToday={isViewingCurrentWeek && dow === todayDow}
          />
        ))}
      </div>
    </div>
  );
}
