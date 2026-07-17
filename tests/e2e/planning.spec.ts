import { test, expect } from "@playwright/test";
import {
  apiSignUp,
  apiCreateFixtureTeam,
  apiCreateEventGroup,
  loginViaUi,
  PASSWORD,
} from "./helpers";

test("event coach builds a cycle with a week and a Monday workout", async ({
  page,
  request,
}) => {
  const headCoach = await apiSignUp(request, "e2e-hc-plan");
  const eventCoach = await apiSignUp(request, "e2e-ec-plan");
  const team = await apiCreateFixtureTeam(request, headCoach, [
    { user: eventCoach, role: "event_coach" },
  ]);
  const groupId = await apiCreateEventGroup(
    request,
    headCoach,
    team.teamId,
    "Distance",
    eventCoach.id,
  );

  await loginViaUi(page, eventCoach.email, PASSWORD);
  await page.goto(`/groups/${groupId}/cycles`);

  await page.getByRole("button", { name: "New cycle" }).click();
  await page.getByLabel("Name").fill("Base Phase");
  await page.getByRole("button", { name: "Create cycle" }).click();
  await expect(page.getByText("Base Phase")).toBeVisible();

  await page.getByText("Base Phase").click();
  await page.waitForURL(/\/cycles\/[^/]+$/);

  await page.getByRole("button", { name: "Add week" }).click();
  // Week number defaults to 1; just confirm the create action.
  await page.getByRole("button", { name: "Add week" }).last().click();
  const weekLink = page.getByRole("link", { name: "Week 1" });
  await expect(weekLink).toBeVisible();

  await weekLink.click();
  await page.waitForURL(/\/weeks\/[^/]+$/, { timeout: 15000 });

  await expect(page.getByText("Monday")).toBeVisible();
  const mondayCard = page.locator('[data-slot="card"]').filter({ hasText: "Monday" });
  await mondayCard.getByRole("button", { name: "Add" }).click();

  await page.getByLabel("Warmup").fill("10 min jog");
  await page.getByLabel("Main work").fill("6x800m");
  await page.getByRole("button", { name: "Save workout" }).click();

  await expect(mondayCard.getByText("10 min jog")).toBeVisible();
  await expect(mondayCard.getByText("6x800m")).toBeVisible();
});
