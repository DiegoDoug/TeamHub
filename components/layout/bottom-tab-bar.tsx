"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { MoreHorizontalIcon } from "lucide-react";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { MobileMoreSheet } from "@/components/layout/mobile-more-sheet";
import { cn } from "@/lib/utils";
import type { TeamRole } from "@/lib/current-team";

const PRIMARY_COUNT = 4;

export function BottomTabBar({
  role,
  userId,
}: {
  role: TeamRole;
  userId: string;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();

  const items = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role),
  );
  const primary = items.slice(0, PRIMARY_COUNT);
  const overflow = items.slice(PRIMARY_COUNT);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Primary"
      >
        {primary.map((item) => {
          const href = item.href(userId);
          const active =
            href === "/dashboard"
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={item.label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground",
                active && "text-primary",
              )}
            >
              <item.icon className="size-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
        {overflow.length > 0 && (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
          >
            <MoreHorizontalIcon className="size-5" aria-hidden="true" />
            More
          </button>
        )}
      </nav>
      <MobileMoreSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        items={overflow}
        userId={userId}
      />
    </>
  );
}
