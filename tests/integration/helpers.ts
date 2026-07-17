import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

config({ path: resolve(__dirname, "../../.env") });

const SUPABASE_URL = process.env.SUPABASE_PUBLIC_URL ?? "http://localhost:8000";
const ANON_KEY = process.env.ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY!;

if (!ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error(
    "ANON_KEY / SERVICE_ROLE_KEY not found — run these tests from the repo root with the dockerized stack up (docker compose up -d db auth rest realtime kong).",
  );
}

/** service_role client — bypasses RLS entirely, for test-fixture setup only. */
export function adminClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

let counter = 0;
/** Unique-per-run email so repeated test runs never collide on signup. */
export function uniqueEmail(label: string) {
  counter += 1;
  return `${label}.${Date.now()}.${counter}@test.trackhub.local`;
}

export type TestUser = {
  id: string;
  email: string;
  client: SupabaseClient<Database>;
};

/** Signs up a fresh user (autoconfirm is on) and returns a client authenticated as them. */
export async function createTestUser(label: string): Promise<TestUser> {
  const email = uniqueEmail(label);
  const password = "test-password-123";
  const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: label } },
  });
  if (error || !data.user) {
    throw new Error(`signUp failed for ${label}: ${error?.message}`);
  }

  return { id: data.user.id, email, client };
}

/** Creates a team as `owner` (via the real insert path, exercising RLS + the
 * head_coach/channel-provisioning trigger), then adds each of `members` to
 * it with the given role using owner's own (head_coach) client — also
 * exercising real RLS, not the service-role bypass. */
export async function createFixtureTeam(
  owner: TestUser,
  members: { user: TestUser; role: "event_coach" | "athlete" }[] = [],
) {
  const teamName = `Fixture Team ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const { data: team, error } = await owner.client
    .from("teams")
    .insert({ name: teamName, created_by: owner.id })
    .select("id")
    .single();
  if (error || !team) throw new Error(`createFixtureTeam failed: ${error?.message}`);

  for (const { user, role } of members) {
    const { error: memberError } = await owner.client
      .from("team_members")
      .insert({ team_id: team.id, profile_id: user.id, role });
    if (memberError) {
      throw new Error(`adding ${user.email} as ${role} failed: ${memberError.message}`);
    }
  }

  return { teamId: team.id, teamName };
}

export function isRlsDenied(error: { code?: string; message?: string } | null) {
  return error?.code === "42501";
}
