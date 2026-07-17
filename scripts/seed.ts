// Seeds a demo team so a fresh clone of the dockerized stack has
// something to look at immediately. Uses the service_role key (bypasses
// RLS) purely for fixture setup — this mirrors what a real onboarding
// flow does (signup -> create team -> add members -> build a plan), just
// scripted instead of clicked through.
//
// Usage: npm run seed   (stack must already be up: docker compose up -d)

import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";

config({ path: resolve(__dirname, "../.env") });

const SUPABASE_URL = process.env.SUPABASE_PUBLIC_URL ?? "http://localhost:8000";
const ANON_KEY = process.env.ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY!;

if (!ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error("ANON_KEY / SERVICE_ROLE_KEY not set — is .env populated?");
}

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = "demo-password-123";

type SeedUser = { email: string; fullName: string; role: "head_coach" | "event_coach" | "athlete" };

const USERS: SeedUser[] = [
  { email: "coach.head@demo.trackhub.local", fullName: "Jordan Hill", role: "head_coach" },
  { email: "coach.sprints@demo.trackhub.local", fullName: "Sam Rivera", role: "event_coach" },
  { email: "athlete.one@demo.trackhub.local", fullName: "Casey Nguyen", role: "athlete" },
  { email: "athlete.two@demo.trackhub.local", fullName: "Morgan Lee", role: "athlete" },
];

async function signUpOrFetch(user: SeedUser) {
  // Using the anon-key signup path (not admin.auth.admin.createUser) so the
  // on_auth_user_created trigger runs exactly as it would for a real user.
  const anon = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await anon.auth.signUp({
    email: user.email,
    password: DEMO_PASSWORD,
    options: { data: { full_name: user.fullName } },
  });
  if (data.user) return data.user.id;

  // Already seeded on a prior run — look up their existing profile id.
  if (error?.message.includes("already registered") || error?.message.includes("already been")) {
    const { data: page } = await admin.auth.admin.listUsers();
    const existing = page.users.find((u) => u.email === user.email);
    if (existing) return existing.id;
  }
  throw new Error(`Could not sign up or find ${user.email}: ${error?.message}`);
}

async function main() {
  console.log("Seeding demo data...");

  const ids = await Promise.all(USERS.map(signUpOrFetch));
  const [headCoachId, eventCoachId, athlete1Id, athlete2Id] = ids;

  const { data: existingTeam } = await admin
    .from("teams")
    .select("id")
    .eq("name", "Riverside Track & Field")
    .maybeSingle();

  let teamId = existingTeam?.id;
  if (!teamId) {
    const { data: team, error } = await admin
      .from("teams")
      .insert({ name: "Riverside Track & Field", created_by: headCoachId })
      .select("id")
      .single();
    if (error) throw error;
    teamId = team.id;
    console.log("Created team:", team.id);
  } else {
    console.log("Team already exists, reusing:", teamId);
  }

  // Idempotent membership upserts (unique on team_id+profile_id). Includes
  // headCoachId too: the on_team_created trigger only grants that on a
  // fresh INSERT, so a reused team (this script run a second time, or
  // pointed at a team created some other way) needs it added explicitly.
  for (const [profileId, role] of [
    [headCoachId, "head_coach"],
    [eventCoachId, "event_coach"],
    [athlete1Id, "athlete"],
    [athlete2Id, "athlete"],
  ] as const) {
    await admin
      .from("team_members")
      .upsert({ team_id: teamId, profile_id: profileId, role }, { onConflict: "team_id,profile_id" });
  }

  const { data: existingGroup } = await admin
    .from("event_groups")
    .select("id")
    .eq("team_id", teamId)
    .eq("name", "Sprints")
    .maybeSingle();

  let groupId = existingGroup?.id;
  if (!groupId) {
    const { data: group, error } = await admin
      .from("event_groups")
      .insert({ team_id: teamId, name: "Sprints", event_coach_id: eventCoachId })
      .select("id")
      .single();
    if (error) throw error;
    groupId = group.id;
  }

  await admin
    .from("event_group_members")
    .upsert(
      [
        { event_group_id: groupId, profile_id: athlete1Id },
        { event_group_id: groupId, profile_id: athlete2Id },
      ],
      { onConflict: "event_group_id,profile_id" },
    );

  const { data: existingCycle } = await admin
    .from("training_cycles")
    .select("id")
    .eq("event_group_id", groupId)
    .eq("name", "Base Phase")
    .maybeSingle();

  let cycleId = existingCycle?.id;
  if (!cycleId) {
    const { data: cycle, error } = await admin
      .from("training_cycles")
      .insert({ event_group_id: groupId, name: "Base Phase", phase: "base" })
      .select("id")
      .single();
    if (error) throw error;
    cycleId = cycle.id;
  }

  const { data: week } = await admin
    .from("training_weeks")
    .upsert(
      { cycle_id: cycleId, week_number: 1, focus: "Aerobic base" },
      { onConflict: "cycle_id,week_number" },
    )
    .select("id")
    .single();

  const todayDow = (new Date().getDay() + 6) % 7; // Mon=0..Sun=6
  await admin.from("training_days").upsert(
    {
      week_id: week!.id,
      day_of_week: todayDow,
      warmup: "15 min easy jog + drills",
      main_work: "6x400m @ goal 5k pace, 90s rest",
      cooldown: "10 min jog",
    },
    { onConflict: "week_id,day_of_week" },
  );

  const { data: teamChannel } = await admin
    .from("channels")
    .select("id")
    .eq("team_id", teamId)
    .eq("type", "team")
    .single();

  await admin.from("calendar_events").insert({
    team_id: teamId,
    type: "meet",
    title: "Riverside Invitational",
    date: new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10),
    location: "Riverside High School Track",
    created_by: headCoachId,
  });

  await admin.from("messages").insert({
    channel_id: teamChannel!.id,
    sender_id: headCoachId,
    content: "Welcome to the season — check the calendar for the first meet.",
  });

  console.log("\nDone. Demo accounts (password: %s):", DEMO_PASSWORD);
  for (const u of USERS) console.log(`  ${u.role.padEnd(12)} ${u.email}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
