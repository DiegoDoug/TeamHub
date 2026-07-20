import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboardIcon,
  UsersIcon,
  ClipboardListIcon,
  MessageSquareIcon,
  CalendarDaysIcon,
  UserIcon,
  SettingsIcon,
} from "lucide-react";
import type { TeamRole } from "@/lib/current-team";

export type NavItem = {
  label: string;
  href: (userId: string) => string;
  icon: LucideIcon;
  /** Omit to show to every role. */
  roles?: TeamRole[];
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: () => "/dashboard", icon: LayoutDashboardIcon },
  { label: "Roster", href: () => "/team/roster", icon: UsersIcon },
  { label: "Log", href: () => "/log", icon: ClipboardListIcon },
  { label: "Chat", href: () => "/chat", icon: MessageSquareIcon },
  { label: "Calendar", href: () => "/calendar", icon: CalendarDaysIcon },
  { label: "Profile", href: (userId) => `/profile/${userId}`, icon: UserIcon },
  {
    label: "Team Settings",
    href: () => "/team/settings",
    icon: SettingsIcon,
    roles: ["head_coach"],
  },
];
