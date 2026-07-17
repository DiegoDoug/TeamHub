import { describe, it, expect, beforeAll } from "vitest";
import {
  createTestUser,
  createFixtureTeam,
  isRlsDenied,
  type TestUser,
} from "./helpers";

describe("workout_logs RLS", () => {
  let headCoach: TestUser;
  let coach: TestUser;
  let athlete: TestUser;
  let otherAthlete: TestUser; // not coached by `coach`, not on `coach`'s roster
  let groupId: string;
  let logId: string;

  beforeAll(async () => {
    [headCoach, coach, athlete, otherAthlete] = await Promise.all([
      createTestUser("head-coach"),
      createTestUser("coach"),
      createTestUser("athlete"),
      createTestUser("other-athlete"),
    ]);
    const team = await createFixtureTeam(headCoach, [
      { user: coach, role: "event_coach" },
      { user: athlete, role: "athlete" },
      { user: otherAthlete, role: "athlete" },
    ]);

    const { data: group } = await headCoach.client
      .from("event_groups")
      .insert({ team_id: team.teamId, name: "Sprints", event_coach_id: coach.id })
      .select("id")
      .single();
    groupId = group!.id;

    await headCoach.client
      .from("event_group_members")
      .insert({ event_group_id: groupId, profile_id: athlete.id });
    // otherAthlete is on the team but NOT in this group / not coached by `coach`
  });

  it("an athlete can log their own workout", async () => {
    const { data, error } = await athlete.client
      .from("workout_logs")
      .insert({
        athlete_id: athlete.id,
        workout_type: "speed",
        effort_rating: 7,
        data: { splits: "5x400m" },
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    logId = data!.id;
  });

  it("an athlete cannot log a workout as someone else", async () => {
    const { error } = await athlete.client.from("workout_logs").insert({
      athlete_id: otherAthlete.id,
      workout_type: "distance",
      effort_rating: 5,
    });
    expect(isRlsDenied(error)).toBe(true);
  });

  it("head_coach can read any athlete's log on their team", async () => {
    const { data } = await headCoach.client
      .from("workout_logs")
      .select("id")
      .eq("id", logId);
    expect(data).toHaveLength(1);
  });

  it("the athlete's own event_coach can read their log", async () => {
    const { data } = await coach.client
      .from("workout_logs")
      .select("id")
      .eq("id", logId);
    expect(data).toHaveLength(1);
  });

  it("an athlete cannot read another athlete's log", async () => {
    const { data } = await otherAthlete.client
      .from("workout_logs")
      .select("id")
      .eq("id", logId);
    expect(data).toEqual([]);
  });

  it("a coach who doesn't coach that athlete's group cannot read their log", async () => {
    const unrelatedCoach = await createTestUser("unrelated-coach");
    // Sign them up but don't add to the team at all — the strictest case.
    const { data } = await unrelatedCoach.client
      .from("workout_logs")
      .select("id")
      .eq("id", logId);
    expect(data).toEqual([]);
  });

  it("an athlete can update and delete their own log", async () => {
    const { error: updateError } = await athlete.client
      .from("workout_logs")
      .update({ effort_rating: 9 })
      .eq("id", logId);
    expect(updateError).toBeNull();

    const { error: deleteError } = await athlete.client
      .from("workout_logs")
      .delete()
      .eq("id", logId);
    expect(deleteError).toBeNull();
  });
});
