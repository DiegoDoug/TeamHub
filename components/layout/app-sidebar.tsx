"use client";

import Link from "next/link";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { NavLink } from "@/components/layout/nav-link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";
import type { TeamRole } from "@/lib/current-team";

export function AppSidebar({
  role,
  userId,
  teamName,
}: {
  role: TeamRole;
  userId: string;
  teamName: string;
}) {
  const items = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role),
  );

  return (
    <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <Link
          href="/dashboard"
          className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary font-heading text-sm font-extrabold tracking-tight text-primary-foreground uppercase"
        >
          TH
        </Link>
        <div className="min-w-0 truncate font-heading text-sm font-bold tracking-tight uppercase">
          {teamName}
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
        {items.map((item) => (
          <NavLink
            key={item.label}
            href={item.href(userId)}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </nav>

      <div className="flex items-center justify-between border-t border-sidebar-border px-3 py-3">
        <ThemeToggle />
        <SignOutButton />
      </div>
    </aside>
  );
}
