import { describe, it, expect, beforeAll } from "vitest";
import {
  createTestUser,
  createFixtureTeam,
  isRlsDenied,
  type TestUser,
} from "./helpers";

describe("calendar_events RLS", () => {
  let headCoach: TestUser;
  let ownCoach: TestUser;
  let otherCoach: TestUser;
  let athlete: TestUser;
  let teamId: string;
  let ownGroupId: string;
  let otherGroupId: string;

  beforeAll(async () => {
    [headCoach, ownCoach, otherCoach, athlete] = await Promise.all([
      createTestUser("head-coach"),
      createTestUser("own-coach"),
      createTestUser("other-coach"),
      createTestUser("athlete"),
    ]);
    const team = await createFixtureTeam(headCoach, [
      { user: ownCoach, role: "event_coach" },
      { user: otherCoach, role: "event_coach" },
      { user: athlete, role: "athlete" },
    ]);
    teamId = team.teamId;

    const [{ data: ownGroup }, { data: otherGroup }] = await Promise.all([
      headCoach.client
        .from("event_groups")
        .insert({ team_id: teamId, name: "Own", event_coach_id: ownCoach.id })
        .select("id")
        .single(),
      headCoach.client
        .from("event_groups")
        .insert({ team_id: teamId, name: "Other", event_coach_id: otherCoach.id })
        .select("id")
        .single(),
    ]);
    ownGroupId = ownGroup!.id;
    otherGroupId = otherGroup!.id;
  });

  it("head_coach can create a whole-team event (no event_group_id)", async () => {
    const { error } = await headCoach.client.from("calendar_events").insert({
      team_id: teamId,
      type: "meet",
      title: "Invitational",
      date: "2026-09-01",
      created_by: headCoach.id,
    });
    expect(error).toBeNull();
  });

  it("event_coach cannot create a whole-team event", async () => {
    const { error } = await ownCoach.client.from("calendar_events").insert({
      team_id: teamId,
      type: "team_meeting",
      title: "Should fail",
      date: "2026-09-02",
      created_by: ownCoach.id,
    });
    expect(isRlsDenied(error)).toBe(true);
  });

  it("event_coach can create an event scoped to their own group, not another's", async () => {
    const { error: ownError } = await ownCoach.client.from("calendar_events").insert({
      team_id: teamId,
      event_group_id: ownGroupId,
      type: "practice",
      title: "Own group practice",
      date: "2026-09-03",
      created_by: ownCoach.id,
    });
    expect(ownError).toBeNull();

    const { error: otherError } = await ownCoach.client.from("calendar_events").insert({
      team_id: teamId,
      event_group_id: otherGroupId,
      type: "practice",
      title: "Should fail",
      date: "2026-09-04",
      created_by: ownCoach.id,
    });
    expect(isRlsDenied(otherError)).toBe(true);
  });

  it("athlete cannot create any calendar event but can read all of them", async () => {
    const { error: writeError } = await athlete.client.from("calendar_events").insert({
      team_id: teamId,
      type: "other",
      title: "Should fail",
      date: "2026-09-05",
      created_by: athlete.id,
    });
    expect(isRlsDenied(writeError)).toBe(true);

    const { data, error: readError } = await athlete.client
      .from("calendar_events")
      .select("id")
      .eq("team_id", teamId);
    expect(readError).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
