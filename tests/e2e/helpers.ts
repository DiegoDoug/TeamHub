import { type APIRequestContext, type Page, expect } from "@playwright/test";

const SUPABASE_URL = process.env.SUPABASE_PUBLIC_URL ?? "http://localhost:8000";
const ANON_KEY =
  process.env.ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";

let counter = 0;
export function uniqueEmail(label: string) {
  counter += 1;
  return `${label}.${Date.now()}.${counter}@e2e.trackhub.local`;
}

export const PASSWORD = "e2e-test-password-123";

export type ApiUser = { id: string; email: string; accessToken: string };

/** Signs up a user directly via the Auth API (fast fixture setup — the
 * signup *flow itself* gets its own dedicated UI test in auth.spec.ts). */
export async function apiSignUp(
  request: APIRequestContext,
  label: string,
): Promise<ApiUser> {
  const email = uniqueEmail(label);
  const res = await request.post(`${SUPABASE_URL}/auth/v1/signup`, {
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    data: { email, password: PASSWORD, data: { full_name: label } },
  });
  expect(res.ok(), `signup failed for ${label}: ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  return { id: body.user.id, email, accessToken: body.access_token };
}

export async function apiRest(
  request: APIRequestContext,
  user: ApiUser,
  path: string,
  init: { method?: string; data?: unknown; headers?: Record<string, string> } = {},
) {
  const res = await request.fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: init.method ?? "GET",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${user.accessToken}`,
      "Content-Type": "application/json",
      ...(init.method && init.method !== "GET" ? { Prefer: "return=representation" } : {}),
      ...init.headers,
    },
    data: init.data,
  });
  expect(res.ok(), `${init.method ?? "GET"} ${path} failed: ${await res.text()}`).toBeTruthy();
  return res.json();
}

/** Creates a team (via the real insert path, as `owner`) and adds each of
 * `members` with the given role, all through the real REST API — exercising
 * the same RLS/trigger path the app itself uses, just without a browser. */
export async function apiCreateFixtureTeam(
  request: APIRequestContext,
  owner: ApiUser,
  members: { user: ApiUser; role: "event_coach" | "athlete" }[] = [],
) {
  const teamName = `E2E Team ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const [team] = await apiRest(request, owner, "teams", {
    method: "POST",
    data: { name: teamName, created_by: owner.id },
  });

  for (const { user, role } of members) {
    await apiRest(request, owner, "team_members", {
      method: "POST",
      data: { team_id: team.id, profile_id: user.id, role },
    });
  }

  return { teamId: team.id as string, teamName };
}

export async function apiCreateEventGroup(
  request: APIRequestContext,
  headCoach: ApiUser,
  teamId: string,
  name: string,
  eventCoachId?: string,
) {
  const [group] = await apiRest(request, headCoach, "event_groups", {
    method: "POST",
    data: { team_id: teamId, name, event_coach_id: eventCoachId ?? null },
  });
  return group.id as string;
}

/** Logs a user into the app through the real login form (the browser client
 * persists the session to cookies, same as a real user). */
export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}
