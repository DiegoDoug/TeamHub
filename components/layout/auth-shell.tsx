import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex size-8 items-center justify-center rounded-md bg-primary font-heading text-sm font-extrabold tracking-tight text-primary-foreground uppercase"
        >
          TH
        </Link>
        <ThemeToggle />
      </header>
      <div className="flex flex-1 items-center justify-center p-6 pt-0">
        {children}
      </div>
    </div>
  );
}
