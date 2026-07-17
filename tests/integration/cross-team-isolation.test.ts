import { describe, it, expect, beforeAll } from "vitest";
import { createTestUser, createFixtureTeam, type TestUser } from "./helpers";

// Broad sanity check: someone who is a head_coach on Team A (so they DO have
// elevated privileges somewhere) must still see nothing from unrelated Team
// B. This guards against role checks that accidentally key off role alone
// instead of role-within-team_id.
describe("cross-team isolation", () => {
  let headCoachA: TestUser;
  let headCoachB: TestUser;
  let athleteB: TestUser;
  let teamBId: string;

  beforeAll(async () => {
    [headCoachA, headCoachB, athleteB] = await Promise.all([
      createTestUser("head-coach-a"),
      createTestUser("head-coach-b"),
      createTestUser("athlete-b"),
    ]);
    await createFixtureTeam(headCoachA);
    const teamB = await createFixtureTeam(headCoachB, [
      { user: athleteB, role: "athlete" },
    ]);
    teamBId = teamB.teamId;
  });

  it("Team A's head_coach cannot see Team B's team row", async () => {
    const { data } = await headCoachA.client
      .from("teams")
      .select("id")
      .eq("id", teamBId);
    expect(data).toEqual([]);
  });

  it("Team A's head_coach cannot see Team B's roster", async () => {
    const { data } = await headCoachA.client
      .from("team_members")
      .select("id")
      .eq("team_id", teamBId);
    expect(data).toEqual([]);
  });

  it("Team A's head_coach cannot update Team B's team name", async () => {
    const { data } = await headCoachA.client
      .from("teams")
      .update({ name: "Hijacked" })
      .eq("id", teamBId)
      .select();
    expect(data).toEqual([]);

    const { data: unchanged } = await headCoachB.client
      .from("teams")
      .select("name")
      .eq("id", teamBId)
      .single();
    expect(unchanged?.name).not.toBe("Hijacked");
  });

  it("Team A's head_coach cannot read Team B's athlete's profile", async () => {
    const { data } = await headCoachA.client
      .from("profiles")
      .select("id")
      .eq("id", athleteB.id);
    expect(data).toEqual([]);
  });

  it("Team A's head_coach cannot read Team B's calendar", async () => {
    await headCoachB.client.from("calendar_events").insert({
      team_id: teamBId,
      type: "other",
      title: "Team B private event",
      date: "2026-10-01",
      created_by: headCoachB.id,
    });
    const { data } = await headCoachA.client
      .from("calendar_events")
      .select("id")
      .eq("team_id", teamBId);
    expect(data).toEqual([]);
  });

  it("Team A's head_coach cannot read Team B's team channel", async () => {
    const { data: channel } = await headCoachB.client
      .from("channels")
      .select("id")
      .eq("team_id", teamBId)
      .eq("type", "team")
      .single();

    const { data } = await headCoachA.client
      .from("channels")
      .select("id")
      .eq("id", channel!.id);
    expect(data).toEqual([]);
  });
});
