import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  accent?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "gap-1 px-4",
        accent && "ring-primary/40",
        className,
      )}
    >
      <div className="flex items-center justify-between px-0">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        {Icon && (
          <Icon
            className={cn(
              "size-4 text-muted-foreground",
              accent && "text-primary",
            )}
            aria-hidden="true"
          />
        )}
      </div>
      <div
        className={cn(
          "font-mono text-2xl font-bold tabular-nums",
          accent && "text-primary",
        )}
      >
        {value}
      </div>
    </Card>
  );
}
