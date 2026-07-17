import { test, expect } from "@playwright/test";
import { uniqueEmail, PASSWORD } from "./helpers";

test.describe("auth & onboarding", () => {
  test("sign up, create a team, land on dashboard as head coach", async ({ page }) => {
    const email = uniqueEmail("e2e-signup");

    await page.goto("/signup");
    await page.getByLabel("Full name").fill("E2E Signup User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    await page.waitForURL(/\/onboarding/, { timeout: 15000 });
    await expect(page.getByText("Welcome to TrackHub")).toBeVisible();

    await page.getByLabel("Team name").fill("E2E Signup Team");
    await page.getByRole("button", { name: "Create team" }).click();

    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "E2E Signup Team" })).toBeVisible();
    await expect(page.getByText("Head Coach")).toBeVisible();
    // Head-coach-only nav item confirms the role landed correctly.
    await expect(page.getByRole("link", { name: "Team Settings" })).toBeVisible();
  });

  test("signing out returns to login, and unauthenticated pages redirect there", async ({
    page,
  }) => {
    const email = uniqueEmail("e2e-signout");
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("E2E Signout User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(/\/onboarding/);

    // Sign-out must be reachable even before the user has a team — otherwise
    // someone waiting to be added has no way to switch accounts.
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/login/, { timeout: 15000 });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
