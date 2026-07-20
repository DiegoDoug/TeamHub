import { test, expect } from "@playwright/test";
import {
  apiSignUp,
  apiCreateFixtureTeam,
  apiCreateEventGroup,
  apiRest,
  loginViaUi,
  PASSWORD,
} from "./helpers";

test("athlete sees today's assigned workout and logs it", async ({ page, request }) => {
  const headCoach = await apiSignUp(request, "e2e-hc-log");
  const athlete = await apiSignUp(request, "e2e-ath-log");
  const team = await apiCreateFixtureTeam(request, headCoach, [
    { user: athlete, role: "athlete" },
  ]);
  const groupId = await apiCreateEventGroup(request, headCoach, team.teamId, "Sprints");
  await apiRest(request, headCoach, "event_group_members", {
    method: "POST",
    data: { event_group_id: groupId, profile_id: athlete.id },
  });

  const [cycle] = await apiRest(request, headCoach, "training_cycles", {
    method: "POST",
    data: { event_group_id: groupId, name: "Base Phase" },
  });
  const [week] = await apiRest(request, headCoach, "training_weeks", {
    method: "POST",
    data: { cycle_id: cycle.id, week_number: 1 },
  });
  // Must match lib/queries/logs.ts: the app computes "today" in UTC
  // (independent of the server process's local timezone), so the test
  // has to derive todayDow the same way rather than from local time.
  const todayDow = (new Date().getUTCDay() + 6) % 7; // Mon=0..Sun=6
  await apiRest(request, headCoach, "training_days", {
    method: "POST",
    data: {
      week_id: week.id,
      day_of_week: todayDow,
      warmup: "15 min easy jog",
      main_work: "5x400m @ 5k pace",
    },
  });

  await loginViaUi(page, athlete.email, PASSWORD);
  await page.goto("/log");

  await expect(page.getByText("5x400m @ 5k pace")).toBeVisible();
  await page.getByRole("button", { name: "Quick log" }).click();

  await page.getByLabel("Workout type").click();
  await page.getByRole("option", { name: "Speed" }).click();
  await page.getByLabel("Effort (1–10)").fill("7");
  await page.getByRole("button", { name: "Log workout" }).click();
  await expect(page.getByText("Workout logged")).toBeVisible();

  await page.goto("/log/history");
  await expect(page.getByText("Effort 7/10")).toBeVisible();
});
