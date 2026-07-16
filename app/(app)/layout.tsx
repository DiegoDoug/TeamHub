import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/current-team";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NAV_ITEMS } from "@/components/layout/nav-items";

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

  // Resolve to plain strings here: functions can't cross the Server ->
  // Client Component boundary (MobileNav needs the list too).
  const items = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(team.role),
  ).map((item) => ({ label: item.label, href: item.href(user.id) }));

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            TrackHub
          </Link>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {team.teamName}
          </span>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {items.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <MobileNav items={items} />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
