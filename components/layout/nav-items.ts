import type { TeamRole } from "@/lib/current-team";

export type NavItem = {
  label: string;
  href: (userId: string) => string;
  /** Omit to show to every role. */
  roles?: TeamRole[];
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: () => "/dashboard" },
  { label: "Roster", href: () => "/team/roster" },
  { label: "Log", href: () => "/log" },
  { label: "Chat", href: () => "/chat" },
  { label: "Calendar", href: () => "/calendar" },
  { label: "Profile", href: (userId) => `/profile/${userId}` },
  {
    label: "Team Settings",
    href: () => "/team/settings",
    roles: ["head_coach"],
  },
];
