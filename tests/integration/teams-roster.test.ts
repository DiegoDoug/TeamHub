import { describe, it, expect, beforeAll } from "vitest";
import {
  createTestUser,
  createFixtureTeam,
  isRlsDenied,
  type TestUser,
} from "./helpers";

describe("teams & roster RLS", () => {
  let headCoach: TestUser;
  let eventCoach: TestUser;
  let athlete: TestUser;
  let outsider: TestUser; // signed up, but never added to the team
  let teamId: string;

  beforeAll(async () => {
    [headCoach, eventCoach, athlete, outsider] = await Promise.all([
      createTestUser("head-coach"),
      createTestUser("event-coach"),
      createTestUser("athlete"),
      createTestUser("outsider"),
    ]);
    const team = await createFixtureTeam(headCoach, [
      { user: eventCoach, role: "event_coach" },
      { user: athlete, role: "athlete" },
    ]);
    teamId = team.teamId;
  });

  it("creating a team makes the creator head_coach via trigger", async () => {
    const { data } = await headCoach.client
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("profile_id", headCoach.id)
      .single();
    expect(data?.role).toBe("head_coach");
  });

  it("creating a team auto-creates its team channel", async () => {
    const { data } = await headCoach.client
      .from("channels")
      .select("id, type")
      .eq("team_id", teamId)
      .eq("type", "team")
      .single();
    expect(data).toBeTruthy();
  });

  it("head_coach can update team name; event_coach and athlete cannot", async () => {
    const { error: hcError } = await headCoach.client
      .from("teams")
      .update({ name: "Renamed by head coach" })
      .eq("id", teamId);
    expect(hcError).toBeNull();

    const { data: ecData } = await eventCoach.client
      .from("teams")
      .update({ name: "Renamed by event coach" })
      .eq("id", teamId)
      .select();
    expect(ecData).toEqual([]); // silently no-ops, RLS filters the row out of the UPDATE

    const { data: athleteData } = await athlete.client
      .from("teams")
      .update({ name: "Renamed by athlete" })
      .eq("id", teamId)
      .select();
    expect(athleteData).toEqual([]);
  });

  it("only head_coach can create an event group", async () => {
    const { error: ecError } = await eventCoach.client
      .from("event_groups")
      .insert({ team_id: teamId, name: "Should fail" });
    expect(isRlsDenied(ecError)).toBe(true);

    const { error: athleteError } = await athlete.client
      .from("event_groups")
      .insert({ team_id: teamId, name: "Should also fail" });
    expect(isRlsDenied(athleteError)).toBe(true);

    const { data: group, error: hcError } = await headCoach.client
      .from("event_groups")
      .insert({ team_id: teamId, name: "Sprints", event_coach_id: eventCoach.id })
      .select("id")
      .single();
    expect(hcError).toBeNull();
    expect(group?.id).toBeTruthy();
  });

  it("event_coach can add an athlete to their own group; a different event_coach cannot", async () => {
    const { data: group } = await headCoach.client
      .from("event_groups")
      .select("id")
      .eq("team_id", teamId)
      .eq("name", "Sprints")
      .single();
    const groupId = group!.id;

    const otherCoach = await createTestUser("other-coach");
    await headCoach.client
      .from("team_members")
      .insert({ team_id: teamId, profile_id: otherCoach.id, role: "event_coach" });

    const { error: wrongCoachError } = await otherCoach.client
      .from("event_group_members")
      .insert({ event_group_id: groupId, profile_id: athlete.id });
    expect(isRlsDenied(wrongCoachError)).toBe(true);

    const { error: rightCoachError } = await eventCoach.client
      .from("event_group_members")
      .insert({ event_group_id: groupId, profile_id: athlete.id });
    expect(rightCoachError).toBeNull();
  });

  it("athlete cannot escalate their own role or add themselves as head_coach", async () => {
    const { data } = await athlete.client
      .from("team_members")
      .update({ role: "head_coach" })
      .eq("team_id", teamId)
      .eq("profile_id", athlete.id)
      .select();
    expect(data).toEqual([]);

    const { data: memberRow } = await headCoach.client
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("profile_id", athlete.id)
      .single();
    expect(memberRow?.role).toBe("athlete");
  });

  it("someone never added to the team cannot read its roster", async () => {
    const { data, error } = await outsider.client
      .from("team_members")
      .select("id")
      .eq("team_id", teamId);
    expect(error).toBeNull();
    expect(data).toEqual([]); // RLS filters to zero rows, not an error
  });
});
