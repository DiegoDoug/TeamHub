import { describe, it, expect, beforeAll } from "vitest";
import {
  createTestUser,
  createFixtureTeam,
  isRlsDenied,
  type TestUser,
} from "./helpers";

describe("chat (channels & messages) RLS", () => {
  let headCoach: TestUser;
  let coach: TestUser;
  let groupMember: TestUser;
  let outsideAthlete: TestUser;
  let teamChannelId: string;
  let groupChannelId: string;

  beforeAll(async () => {
    [headCoach, coach, groupMember, outsideAthlete] = await Promise.all([
      createTestUser("head-coach"),
      createTestUser("coach"),
      createTestUser("group-member"),
      createTestUser("outside-athlete"),
    ]);
    const team = await createFixtureTeam(headCoach, [
      { user: coach, role: "event_coach" },
      { user: groupMember, role: "athlete" },
      { user: outsideAthlete, role: "athlete" },
    ]);

    const { data: teamChannel } = await headCoach.client
      .from("channels")
      .select("id")
      .eq("team_id", team.teamId)
      .eq("type", "team")
      .single();
    teamChannelId = teamChannel!.id;

    const { data: group } = await headCoach.client
      .from("event_groups")
      .insert({ team_id: team.teamId, name: "Sprints", event_coach_id: coach.id })
      .select("id")
      .single();

    await headCoach.client
      .from("event_group_members")
      .insert({ event_group_id: group!.id, profile_id: groupMember.id });

    const { data: groupChannel } = await headCoach.client
      .from("channels")
      .select("id")
      .eq("event_group_id", group!.id)
      .eq("type", "event_group")
      .single();
    groupChannelId = groupChannel!.id;
  });

  it("every team member can post in the team channel", async () => {
    const { error: hcError } = await headCoach.client
      .from("messages")
      .insert({ channel_id: teamChannelId, sender_id: headCoach.id, content: "hi from HC" });
    expect(hcError).toBeNull();

    const { error: athleteError } = await outsideAthlete.client
      .from("messages")
      .insert({ channel_id: teamChannelId, sender_id: outsideAthlete.id, content: "hi from athlete" });
    expect(athleteError).toBeNull();
  });

  it("only the group's coach and its members can post in the event-group channel", async () => {
    const { error: memberError } = await groupMember.client
      .from("messages")
      .insert({ channel_id: groupChannelId, sender_id: groupMember.id, content: "hi from member" });
    expect(memberError).toBeNull();

    const { error: outsiderError } = await outsideAthlete.client
      .from("messages")
      .insert({ channel_id: groupChannelId, sender_id: outsideAthlete.id, content: "should fail" });
    expect(isRlsDenied(outsiderError)).toBe(true);
  });

  it("a user cannot send a message impersonating another sender", async () => {
    const { error } = await outsideAthlete.client
      .from("messages")
      .insert({ channel_id: teamChannelId, sender_id: headCoach.id, content: "impersonation" });
    expect(isRlsDenied(error)).toBe(true);
  });

  it("a user outside the group cannot read its channel's messages", async () => {
    const { data } = await outsideAthlete.client
      .from("messages")
      .select("id")
      .eq("channel_id", groupChannelId);
    expect(data).toEqual([]);
  });
});
