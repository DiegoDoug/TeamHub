import { test, expect } from "@playwright/test";
import {
  apiSignUp,
  apiCreateFixtureTeam,
  apiRest,
  loginViaUi,
  PASSWORD,
} from "./helpers";

test("two team members see each other's messages live, without a reload", async ({
  browser,
  request,
}) => {
  const headCoach = await apiSignUp(request, "e2e-hc-chat");
  const athlete = await apiSignUp(request, "e2e-ath-chat");
  const team = await apiCreateFixtureTeam(request, headCoach, [
    { user: athlete, role: "athlete" },
  ]);
  const [teamChannel] = await apiRest(
    request,
    headCoach,
    `channels?team_id=eq.${team.teamId}&type=eq.team&select=id`,
  );
  const channelId = teamChannel.id as string;

  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await loginViaUi(pageA, headCoach.email, PASSWORD);
  await loginViaUi(pageB, athlete.email, PASSWORD);

  await pageA.goto(`/chat/${channelId}`);
  await pageB.goto(`/chat/${channelId}`);

  const message = `Live message ${Date.now()}`;
  await pageA.getByPlaceholder("Message").fill(message);
  await pageA.getByRole("button", { name: "Send" }).click();

  // pageB never reloads — this proves live delivery, not a re-fetch.
  await expect(pageB.getByText(message)).toBeVisible({ timeout: 10000 });

  await contextA.close();
  await contextB.close();
});
