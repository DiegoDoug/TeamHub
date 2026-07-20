import { redirect } from "next/navigation";
import { getCurrentTeam } from "@/lib/current-team";
import { TeamNameForm } from "@/components/team-settings/team-name-form";
import { PageHeader } from "@/components/shared/page-header";
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
      <PageHeader className="mb-0" title="Team Settings" />
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
