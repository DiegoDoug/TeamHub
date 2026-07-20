"use client";

import type { NavItem } from "@/components/layout/nav-items";
import { NavLink } from "@/components/layout/nav-link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function MobileMoreSheet({
  open,
  onOpenChange,
  items,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: NavItem[];
  userId: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader>
          <SheetTitle>More</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-0.5 px-4 pb-2">
          {items.map((item) => (
            <NavLink
              key={item.label}
              href={item.href(userId)}
              label={item.label}
              icon={item.icon}
              onNavigate={() => onOpenChange(false)}
            />
          ))}
        </nav>
        <div className="flex items-center justify-between border-t px-4 py-3">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </SheetContent>
    </Sheet>
  );
}
