import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateTeamForm } from "@/components/onboarding/create-team-form";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id")
    .limit(1);

  if (memberships && memberships.length > 0) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Welcome to TrackHub</CardTitle>
              <CardDescription>
                Start a new team, or wait for your head coach to add you by email.
              </CardDescription>
            </div>
            <SignOutButton />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create">
            <TabsList className="w-full">
              <TabsTrigger value="create" className="flex-1">
                Create a team
              </TabsTrigger>
              <TabsTrigger value="join" className="flex-1">
                Join a team
              </TabsTrigger>
            </TabsList>
            <TabsContent value="create" className="pt-4">
              <CreateTeamForm />
            </TabsContent>
            <TabsContent value="join" className="pt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Ask your head coach to add <strong>{user.email}</strong> to
                your team&apos;s roster. Once they do, refresh this page.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
