import { describe, it, expect, beforeAll } from "vitest";
import {
  createTestUser,
  createFixtureTeam,
  isRlsDenied,
  type TestUser,
} from "./helpers";

describe("training plan (cycle -> week -> day) RLS", () => {
  let headCoach: TestUser;
  let ownCoach: TestUser; // coaches the group under test
  let otherCoach: TestUser; // coaches a different group on the same team
  let groupMember: TestUser; // athlete in the group under test
  let outsideAthlete: TestUser; // athlete on the team, not in this group
  let ownGroupId: string;
  let otherGroupId: string;
  let cycleId: string;
  let weekId: string;

  beforeAll(async () => {
    [headCoach, ownCoach, otherCoach, groupMember, outsideAthlete] =
      await Promise.all([
        createTestUser("head-coach"),
        createTestUser("own-coach"),
        createTestUser("other-coach"),
        createTestUser("group-member"),
        createTestUser("outside-athlete"),
      ]);
    const team = await createFixtureTeam(headCoach, [
      { user: ownCoach, role: "event_coach" },
      { user: otherCoach, role: "event_coach" },
      { user: groupMember, role: "athlete" },
      { user: outsideAthlete, role: "athlete" },
    ]);

    const { data: ownGroup } = await headCoach.client
      .from("event_groups")
      .insert({ team_id: team.teamId, name: "Own Group", event_coach_id: ownCoach.id })
      .select("id")
      .single();
    ownGroupId = ownGroup!.id;

    const { data: otherGroup } = await headCoach.client
      .from("event_groups")
      .insert({ team_id: team.teamId, name: "Other Group", event_coach_id: otherCoach.id })
      .select("id")
      .single();
    otherGroupId = otherGroup!.id;

    await headCoach.client
      .from("event_group_members")
      .insert({ event_group_id: ownGroupId, profile_id: groupMember.id });
  });

  it("the group's own event_coach can create a cycle; a different event_coach cannot", async () => {
    const { error: wrongCoachError } = await otherCoach.client
      .from("training_cycles")
      .insert({ event_group_id: ownGroupId, name: "Should fail" });
    expect(isRlsDenied(wrongCoachError)).toBe(true);

    const { data: cycle, error } = await ownCoach.client
      .from("training_cycles")
      .insert({ event_group_id: ownGroupId, name: "Base Phase", phase: "base" })
      .select("id")
      .single();
    expect(error).toBeNull();
    cycleId = cycle!.id;
  });

  it("head_coach can also create/manage cycles for any group", async () => {
    const { error } = await headCoach.client
      .from("training_cycles")
      .insert({ event_group_id: otherGroupId, name: "HC-created cycle" });
    expect(error).toBeNull();
  });

  it("an athlete in the group can read the cycle; an athlete outside the group cannot", async () => {
    const { data: memberView } = await groupMember.client
      .from("training_cycles")
      .select("id")
      .eq("id", cycleId);
    expect(memberView).toHaveLength(1);

    const { data: outsiderView } = await outsideAthlete.client
      .from("training_cycles")
      .select("id")
      .eq("id", cycleId);
    expect(outsiderView).toEqual([]);
  });

  it("week creation respects the same group-coach scoping, and rejects duplicate week numbers", async () => {
    const { error: wrongCoachError } = await otherCoach.client
      .from("training_weeks")
      .insert({ cycle_id: cycleId, week_number: 1 });
    expect(isRlsDenied(wrongCoachError)).toBe(true);

    const { data: week, error } = await ownCoach.client
      .from("training_weeks")
      .insert({ cycle_id: cycleId, week_number: 1, focus: "Aerobic base" })
      .select("id")
      .single();
    expect(error).toBeNull();
    weekId = week!.id;

    const { error: dupeError } = await ownCoach.client
      .from("training_weeks")
      .insert({ cycle_id: cycleId, week_number: 1 });
    expect(dupeError?.code).toBe("23505");
  });

  it("day upsert respects group-coach scoping and the (week,day_of_week) uniqueness", async () => {
    const { error: wrongCoachError } = await otherCoach.client
      .from("training_days")
      .insert({ week_id: weekId, day_of_week: 0, warmup: "hack" });
    expect(isRlsDenied(wrongCoachError)).toBe(true);

    const { error } = await ownCoach.client.from("training_days").upsert(
      { week_id: weekId, day_of_week: 0, warmup: "10 min jog", main_work: "6x800m" },
      { onConflict: "week_id,day_of_week" },
    );
    expect(error).toBeNull();

    // athlete cannot write, even to their own group's plan
    const { error: athleteWriteError } = await groupMember.client
      .from("training_days")
      .upsert(
        { week_id: weekId, day_of_week: 1, warmup: "hack" },
        { onConflict: "week_id,day_of_week" },
      );
    expect(isRlsDenied(athleteWriteError)).toBe(true);
  });

  it("deleting a cycle cascades to its weeks and days", async () => {
    const { error } = await ownCoach.client
      .from("training_cycles")
      .delete()
      .eq("id", cycleId);
    expect(error).toBeNull();

    const { data: weeksLeft } = await headCoach.client
      .from("training_weeks")
      .select("id")
      .eq("cycle_id", cycleId);
    expect(weeksLeft).toEqual([]);
  });
});
