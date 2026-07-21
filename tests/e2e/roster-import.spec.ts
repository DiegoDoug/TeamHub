import { test, expect } from "@playwright/test";
import { apiSignUp, loginViaUi, PASSWORD } from "./helpers";

test("head coach imports a CSV roster, then an athlete claims their row via join code", async ({
  page,
}) => {
  const headCoach = await apiSignUp(page.request, "e2e-hc-import");
  await loginViaUi(page, headCoach.email, PASSWORD);

  // Create a team through the UI so a join_code gets generated.
  await page.goto("/onboarding");
  await page.getByLabel("Team name").fill("Import Test Team");
  await page.getByRole("button", { name: "Create team" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });

  await page.goto("/team/roster");

  const joinCode = await page.getByTestId("join-code").textContent();
  expect(joinCode).toBeTruthy();

  await page.getByRole("button", { name: "Import roster" }).click();
  await page
    .getByLabel("CSV (name, email, group, role)")
    .fill("name,email,group,role\nE2E Import Athlete,,Sprints,athlete");
  await page.getByRole("button", { name: "Parse CSV" }).click();

  await expect(
    page.locator('input[value="E2E Import Athlete"]'),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Import 1 people$/ }).click();
  await expect(page.getByText(/Imported roster/)).toBeVisible();

  await expect(page.getByText("Not yet claimed")).toBeVisible();
  await expect(
    page.getByRole("row", { name: /E2E Import Athlete/ }),
  ).toBeVisible();

  // A brand-new athlete signs up and claims the imported row by join code.
  const athlete = await apiSignUp(page.request, "e2e-ath-import");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/login/, { timeout: 15000 });
  await loginViaUi(page, athlete.email, PASSWORD);
  await page.goto("/onboarding");

  await page.getByRole("tab", { name: "Join a team" }).click();
  await page.getByLabel("Join code").fill(joinCode!);
  await page.getByRole("button", { name: "Find my team" }).click();

  await expect(page.getByText("Import Test Team")).toBeVisible();
  await page.getByRole("button", { name: /E2E Import Athlete/ }).click();
  await page.getByRole("button", { name: "That's me" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });

  // Confirm the claim actually landed on the head coach's roster page. The
  // member row shows the athlete's own account name (from signup), not the
  // coach's CSV label — that's the real identity winning post-claim.
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/login/, { timeout: 15000 });
  await loginViaUi(page, headCoach.email, PASSWORD);
  await page.goto("/team/roster");
  await expect(page.getByText("Not yet claimed")).not.toBeVisible();
  await expect(
    page.getByRole("row", { name: new RegExp(athlete.email) }),
  ).toBeVisible();
});
