import { describe, it, expect, beforeAll } from "vitest";
import {
  createTestUser,
  createFixtureTeam,
  isRlsDenied,
  type TestUser,
} from "./helpers";

describe("roster import: pending members, join code, claim flow", () => {
  let headCoach: TestUser;
  let athlete: TestUser;
  let outsider: TestUser;
  let teamId: string;
  let joinCode: string;

  beforeAll(async () => {
    [headCoach, athlete, outsider] = await Promise.all([
      createTestUser("import-hc"),
      createTestUser("import-athlete"),
      createTestUser("import-outsider"),
    ]);
    const team = await createFixtureTeam(headCoach, [
      { user: athlete, role: "athlete" },
    ]);
    teamId = team.teamId;

    joinCode = `T${Date.now().toString(36).toUpperCase().slice(-5)}`;
    const { error } = await headCoach.client
      .from("teams")
      .update({ join_code: joinCode })
      .eq("id", teamId);
    if (error) throw new Error(`setting join_code failed: ${error.message}`);
  });

  it("only head_coach can insert a pending roster member", async () => {
    const { error: athleteError } = await athlete.client
      .from("pending_roster_members")
      .insert({ team_id: teamId, full_name: "Should fail", source: "manual" });
    expect(isRlsDenied(athleteError)).toBe(true);

    const { data, error: hcError } = await headCoach.client
      .from("pending_roster_members")
      .insert({ team_id: teamId, full_name: "Jordan Diaz", source: "manual" })
      .select("id")
      .single();
    expect(hcError).toBeNull();
    expect(data?.id).toBeTruthy();
  });

  it("someone outside the team cannot read pending roster members directly", async () => {
    const { data, error } = await outsider.client
      .from("pending_roster_members")
      .select("id")
      .eq("team_id", teamId);
    expect(error).toBeNull();
    expect(data).toEqual([]); // RLS filters to zero rows, not an error
  });

  it("list_pending_roster_by_join_code returns the team + pending names for a valid code, without requiring team membership", async () => {
    const { data, error } = await outsider.client.rpc(
      "list_pending_roster_by_join_code",
      { p_code: joinCode },
    );
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
    expect(data?.[0].team_name).toBeTruthy();
    expect(data?.some((row) => row.full_name === "Jordan Diaz")).toBe(true);
  });

  it("list_pending_roster_by_join_code returns nothing for an unknown code", async () => {
    const { data, error } = await outsider.client.rpc(
      "list_pending_roster_by_join_code",
      { p_code: "NOPE00" },
    );
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("claim_roster_slot lets a new user claim a pending row, creating their real team_members (+ event_group_members) row with the row's role", async () => {
    const { data: group } = await headCoach.client
      .from("event_groups")
      .insert({ team_id: teamId, name: "Sprints" })
      .select("id")
      .single();

    const claimant = await createTestUser("import-claimant");
    const { data: pendingRow } = await headCoach.client
      .from("pending_roster_members")
      .insert({
        team_id: teamId,
        event_group_id: group!.id,
        full_name: "Sam Lee",
        role: "athlete",
        source: "csv",
      })
      .select("id")
      .single();

    const { error: claimError } = await claimant.client.rpc("claim_roster_slot", {
      p_pending_id: pendingRow!.id,
      p_code: joinCode,
    });
    expect(claimError).toBeNull();

    const { data: memberRow } = await claimant.client
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("profile_id", claimant.id)
      .single();
    expect(memberRow?.role).toBe("athlete");

    const { data: groupMemberRow } = await claimant.client
      .from("event_group_members")
      .select("id")
      .eq("event_group_id", group!.id)
      .eq("profile_id", claimant.id)
      .maybeSingle();
    expect(groupMemberRow).toBeTruthy();

    const { data: pendingAfter } = await headCoach.client
      .from("pending_roster_members")
      .select("status, claimed_profile_id")
      .eq("id", pendingRow!.id)
      .single();
    expect(pendingAfter?.status).toBe("claimed");
    expect(pendingAfter?.claimed_profile_id).toBe(claimant.id);
  });

  it("claiming an already-claimed row fails", async () => {
    const { data: pendingRow } = await headCoach.client
      .from("pending_roster_members")
      .insert({ team_id: teamId, full_name: "Taylor Reed", source: "manual" })
      .select("id")
      .single();

    const first = await createTestUser("import-first-claim");
    const second = await createTestUser("import-second-claim");

    const { error: firstError } = await first.client.rpc("claim_roster_slot", {
      p_pending_id: pendingRow!.id,
      p_code: joinCode,
    });
    expect(firstError).toBeNull();

    const { error: secondError } = await second.client.rpc("claim_roster_slot", {
      p_pending_id: pendingRow!.id,
      p_code: joinCode,
    });
    expect(secondError).toBeTruthy();
  });

  it("claiming with the wrong join code fails", async () => {
    const { data: pendingRow } = await headCoach.client
      .from("pending_roster_members")
      .insert({ team_id: teamId, full_name: "Wrong Code", source: "manual" })
      .select("id")
      .single();

    const claimant = await createTestUser("import-wrong-code");
    const { error } = await claimant.client.rpc("claim_roster_slot", {
      p_pending_id: pendingRow!.id,
      p_code: "WRONGCODE",
    });
    expect(error).toBeTruthy();
  });
});
