"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  removePendingMember,
  resolvePendingMemberByEmail,
} from "@/lib/actions/roster-import";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const SOURCE_LABEL: Record<string, string> = {
  csv: "CSV",
  url: "URL",
  manual: "Manual",
};

export function PendingMemberRow({
  pendingId,
  fullName,
  groupName,
  role,
  source,
}: {
  pendingId: string;
  fullName: string;
  groupName: string | null;
  role: "athlete" | "event_coach";
  source: string;
}) {
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleResolve(formData: FormData) {
    setResolveError(null);
    formData.set("pendingId", pendingId);
    startTransition(async () => {
      const result = await resolvePendingMemberByEmail(null, formData);
      if (result?.error) {
        setResolveError(result.error);
        return;
      }
      toast.success("Linked to their account");
      setResolveOpen(false);
    });
  }

  async function handleRemove() {
    try {
      await removePendingMember(pendingId);
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : "Could not remove",
      };
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{fullName}</TableCell>
      <TableCell className="text-muted-foreground">{groupName ?? "—"}</TableCell>
      <TableCell>
        <Badge variant="secondary">
          {role === "event_coach" ? "Event Coach" : "Athlete"}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {SOURCE_LABEL[source] ?? source}
      </TableCell>
      <TableCell className="flex justify-end gap-1">
        <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
          <DialogTrigger
            render={
              <Button size="sm" variant="ghost">
                Resolve by email
              </Button>
            }
          />
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Link {fullName} to an account</DialogTitle>
              <DialogDescription>
                If they already have a TrackHub account, link it here instead
                of waiting for them to claim it via the join code.
              </DialogDescription>
            </DialogHeader>
            <form action={handleResolve} className="space-y-3">
              <Input
                name="email"
                type="email"
                required
                placeholder="athlete@example.com"
              />
              {resolveError && (
                <p className="text-sm text-destructive">{resolveError}</p>
              )}
              <DialogFooter>
                <DialogClose
                  render={
                    <Button
                      type="button"
                      data-slot="dialog-close"
                      variant="outline"
                    />
                  }
                >
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={pending}>
                  {pending ? "Linking…" : "Link account"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="ghost">
              Remove
            </Button>
          }
          title={`Remove ${fullName} from the pending roster?`}
          confirmLabel="Remove"
          successMessage="Removed"
          onConfirm={handleRemove}
        />
      </TableCell>
    </TableRow>
  );
}
