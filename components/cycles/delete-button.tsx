"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Generic confirm-then-call-server-action delete control shared by cycle,
// week, and day cards. `action` is a server action pre-bound with its ids
// (e.g. `() => deleteCycle(cycle.id, groupId)`), called directly rather than
// via a <form action>, so we can gate it behind window.confirm() first.
export function DeleteButton({
  action,
  confirmMessage,
  label,
}: {
  action: () => Promise<{ error: string } | null>;
  confirmMessage: string;
  label: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        startTransition(async () => {
          const result = await action();
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <Trash2Icon className="size-4 text-destructive" />
    </Button>
  );
}
