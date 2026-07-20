"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyWeekForward } from "@/lib/actions/cycles";

export function CopyWeekForwardButton({
  weekId,
  groupId,
  cycleId,
  weekNumber,
}: {
  weekId: string;
  groupId: string;
  cycleId: string;
  weekNumber: number;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await copyWeekForward(weekId, groupId, cycleId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`Week ${result.weekNumber} created from Week ${weekNumber}`, {
        action: {
          label: "View",
          onClick: () =>
            router.push(
              `/groups/${groupId}/cycles/${cycleId}/weeks/${result.weekId}`,
            ),
        },
      });
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={pending}
    >
      <CopyIcon className="size-4" />
      {pending ? "Copying…" : "Copy to next week"}
    </Button>
  );
}
