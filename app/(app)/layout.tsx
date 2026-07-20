import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/current-team";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const team = await getCurrentTeam();
  if (!team) redirect("/onboarding");

  return (
    <AppShell role={team.role} userId={user.id} teamName={team.teamName}>
      {children}
    </AppShell>
  );
}
