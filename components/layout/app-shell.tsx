"use client";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import type { TeamRole } from "@/lib/current-team";

export function AppShell({
  role,
  userId,
  teamName,
  children,
}: {
  role: TeamRole;
  userId: string;
  teamName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh">
      <AppSidebar role={role} userId={userId} teamName={teamName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 lg:pb-6">
          {children}
        </main>
        <BottomTabBar role={role} userId={userId} />
      </div>
    </div>
  );
}
