import { test, expect } from "@playwright/test";
import { apiSignUp, apiCreateFixtureTeam, loginViaUi, PASSWORD } from "./helpers";

test("athlete edits their own profile and it persists across reload", async ({
  page,
  request,
}) => {
  const headCoach = await apiSignUp(request, "e2e-hc-profile");
  const athlete = await apiSignUp(request, "e2e-ath-profile");
  await apiCreateFixtureTeam(request, headCoach, [{ user: athlete, role: "athlete" }]);

  await loginViaUi(page, athlete.email, PASSWORD);
  await page.goto(`/profile/${athlete.id}`);

  await page.getByLabel("Primary events").fill("100m, 200m");
  await page.getByRole("button", { name: "Add PR" }).click();
  await page.getByLabel("Event", { exact: true }).fill("100m");
  await page.getByLabel("Mark", { exact: true }).fill("11.2");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile updated")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Primary events")).toHaveValue("100m, 200m");
  await expect(page.getByLabel("Event", { exact: true })).toHaveValue("100m");
  await expect(page.getByLabel("Mark", { exact: true })).toHaveValue("11.2");
});

test("a teammate sees a read-only view with no edit controls", async ({
  page,
  request,
}) => {
  const headCoach = await apiSignUp(request, "e2e-hc-profile2");
  const athlete = await apiSignUp(request, "e2e-ath-profile2");
  await apiCreateFixtureTeam(request, headCoach, [{ user: athlete, role: "athlete" }]);

  await loginViaUi(page, headCoach.email, PASSWORD);
  await page.goto(`/profile/${athlete.id}`);

  await expect(page.getByRole("heading", { name: "e2e-ath-profile2" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save profile" })).toHaveCount(0);
});
