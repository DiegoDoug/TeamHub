import "server-only";
import { createClient } from "@/lib/supabase/server";

export type CurrentWeekPointer = {
  cycleId: string;
  cycleName: string;
  weekId: string;
  weekNumber: number;
};

// Infers "this week" for a group from its active cycle's start_date: weeks
// are assumed to run in sequential 7-day blocks from that date, the same
// convention coaches already follow when numbering training_weeks. Only
// returns a pointer when a training_weeks row for that week number actually
// exists — there's nothing to jump to otherwise.
export async function getCurrentWeekForGroup(
  groupId: string,
): Promise<CurrentWeekPointer | null> {
  const supabase = await createClient();
  const todayIso = new Date().toISOString().slice(0, 10);

  const { data: cycles } = await supabase
    .from("training_cycles")
    .select("id, name, start_date, end_date")
    .eq("event_group_id", groupId);

  const activeCycle = (cycles ?? []).find((c) => {
    if (!c.start_date) return false;
    if (c.start_date > todayIso) return false;
    if (c.end_date && c.end_date < todayIso) return false;
    return true;
  });
  if (!activeCycle?.start_date) return null;

  const daysSinceStart = Math.floor(
    (Date.parse(todayIso) - Date.parse(activeCycle.start_date)) /
      (1000 * 60 * 60 * 24),
  );
  const weekNumber = Math.floor(daysSinceStart / 7) + 1;

  const { data: week } = await supabase
    .from("training_weeks")
    .select("id, week_number")
    .eq("cycle_id", activeCycle.id)
    .eq("week_number", weekNumber)
    .maybeSingle();
  if (!week) return null;

  return {
    cycleId: activeCycle.id,
    cycleName: activeCycle.name,
    weekId: week.id,
    weekNumber: week.week_number,
  };
}
