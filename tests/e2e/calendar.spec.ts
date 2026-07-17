import { test, expect } from "@playwright/test";
import {
  apiSignUp,
  apiCreateFixtureTeam,
  loginViaUi,
  PASSWORD,
} from "./helpers";

test("head coach adds a meet; athlete sees it read-only", async ({
  page,
  request,
}) => {
  const headCoach = await apiSignUp(request, "e2e-hc-cal");
  const athlete = await apiSignUp(request, "e2e-ath-cal");
  await apiCreateFixtureTeam(request, headCoach, [{ user: athlete, role: "athlete" }]);

  await loginViaUi(page, headCoach.email, PASSWORD);
  await page.goto("/calendar");

  await page.getByRole("button", { name: "New event" }).click();
  await page.getByLabel("Title").fill("Riverside Invitational");
  const today = new Date().toISOString().slice(0, 10);
  await page.getByLabel("Date").fill(today);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Event created")).toBeVisible();
  await expect(page.getByText("Riverside Invitational")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/login/);
  await loginViaUi(page, athlete.email, PASSWORD);
  await page.goto("/calendar");

  await expect(page.getByText("Riverside Invitational")).toBeVisible();
  await expect(page.getByRole("button", { name: "New event" })).toHaveCount(0);
});
