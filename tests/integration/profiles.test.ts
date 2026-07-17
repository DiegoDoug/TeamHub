import { describe, it, expect, beforeAll } from "vitest";
import { createTestUser, createFixtureTeam, type TestUser } from "./helpers";

describe("profiles RLS", () => {
  let headCoach: TestUser;
  let teammate: TestUser;
  let stranger: TestUser; // never shared a team with anyone here

  beforeAll(async () => {
    [headCoach, teammate, stranger] = await Promise.all([
      createTestUser("head-coach"),
      createTestUser("teammate"),
      createTestUser("stranger"),
    ]);
    await createFixtureTeam(headCoach, [{ user: teammate, role: "athlete" }]);
  });

  it("auto-provisions a profile row on signup with the right name/email", async () => {
    const { data } = await headCoach.client
      .from("profiles")
      .select("full_name, email")
      .eq("id", headCoach.id)
      .single();
    expect(data?.email).toBe(headCoach.email);
    expect(data?.full_name).toBe("head-coach");
  });

  it("a user can always read and edit their own profile", async () => {
    const { error } = await headCoach.client
      .from("profiles")
      .update({ primary_events: "400m" })
      .eq("id", headCoach.id);
    expect(error).toBeNull();
  });

  it("teammates can read each other's profiles", async () => {
    const { data } = await teammate.client
      .from("profiles")
      .select("id")
      .eq("id", headCoach.id);
    expect(data).toHaveLength(1);
  });

  it("a stranger (no shared team) cannot read someone's profile", async () => {
    const { data } = await stranger.client
      .from("profiles")
      .select("id")
      .eq("id", headCoach.id);
    expect(data).toEqual([]);
  });

  it("a user cannot edit a teammate's profile", async () => {
    const { data } = await teammate.client
      .from("profiles")
      .update({ full_name: "Hacked" })
      .eq("id", headCoach.id)
      .select();
    expect(data).toEqual([]);
  });
});
