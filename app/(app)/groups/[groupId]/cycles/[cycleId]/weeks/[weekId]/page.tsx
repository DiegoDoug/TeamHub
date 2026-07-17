import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/current-team";
import { DayCard } from "@/components/cycles/day-card";
import { DAY_LABELS } from "@/lib/validation/cycles";

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

  const [{ data: group }, { data: cycle }, { data: week }, { data: days }, team] =
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
    ]);

  // Any broken link in the group -> cycle -> week chain (wrong ids, or RLS
  // hiding the group) is a 404 from the caller's perspective.
  if (!group || !cycle || !week) notFound();

  const canManage =
    !!team &&
    (team.role === "head_coach" ||
      (team.role === "event_coach" && group.event_coach_id === user?.id));

  const daysByDow = new Map((days ?? []).map((d) => [d.day_of_week, d]));

  return (
    <div className="space-y-6">
      <Link
        href={`/groups/${groupId}/cycles/${cycleId}`}
        className="text-sm text-muted-foreground underline underline-offset-4"
      >
        ← Back to weeks
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Week {week.week_number}
          {week.focus ? ` — ${week.focus}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">{cycle.name}</p>
        {week.notes && <p className="mt-2 text-sm text-muted-foreground">{week.notes}</p>}
      </div>

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
          />
        ))}
      </div>
    </div>
  );
}
