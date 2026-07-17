import { redirect } from "next/navigation";
import { getCurrentTeam } from "@/lib/current-team";
import { TeamNameForm } from "@/components/team-settings/team-name-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function TeamSettingsPage() {
  const team = await getCurrentTeam();
  if (!team) redirect("/onboarding");
  if (team.role !== "head_coach") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Team Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Team details</CardTitle>
          <CardDescription>Visible to everyone on the team.</CardDescription>
        </CardHeader>
        <CardContent>
          <TeamNameForm teamId={team.teamId} initialName={team.teamName} />
        </CardContent>
      </Card>
    </div>
  );
}
