import { test, expect } from "@playwright/test";
import { apiSignUp, apiCreateFixtureTeam, loginViaUi, PASSWORD } from "./helpers";

test("head coach stands up an event group with a coach and an athlete", async ({
  page,
  request,
}) => {
  const headCoach = await apiSignUp(request, "e2e-hc-roster");
  const eventCoach = await apiSignUp(request, "e2e-ec-roster");
  const athlete = await apiSignUp(request, "e2e-ath-roster");
  await apiCreateFixtureTeam(request, headCoach, [
    { user: eventCoach, role: "event_coach" },
    { user: athlete, role: "athlete" },
  ]);

  await loginViaUi(page, headCoach.email, PASSWORD);
  await page.goto("/team/roster");

  await page.getByRole("button", { name: "New group" }).click();
  await page.getByLabel("Group name").fill("Sprints");
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page.getByText("Event group created")).toBeVisible();

  const groupCard = page.locator('[data-slot="card"]').filter({ hasText: "Sprints" });
  await expect(groupCard.getByText("No athletes yet.")).toBeVisible();

  // Add the athlete to the new group via the group card's picker.
  await groupCard.getByRole("combobox").click();
  await page.getByRole("option", { name: "e2e-ath-roster" }).click();
  await groupCard.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Athlete added to group")).toBeVisible();
  await expect(groupCard.getByText("e2e-ath-roster")).toBeVisible();
});
