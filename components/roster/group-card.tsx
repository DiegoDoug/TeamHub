"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { X, UserPlusIcon } from "lucide-react";
import {
  addAthletesToGroup,
  removeAthleteFromGroup,
} from "@/lib/actions/roster";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Member = { profileId: string; name: string };

export function GroupCard({
  groupId,
  groupName,
  coachName,
  members,
  availableAthletes,
  canManage,
}: {
  groupId: string;
  groupName: string;
  coachName: string | null;
  members: Member[];
  availableAthletes: Member[];
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [picked, setPicked] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  function togglePicked(profileId: string, checked: boolean) {
    setPicked((prev) =>
      checked ? [...prev, profileId] : prev.filter((id) => id !== profileId),
    );
  }

  function handleAdd() {
    if (picked.length === 0) return;
    startTransition(async () => {
      try {
        await addAthletesToGroup(groupId, picked);
        toast.success(
          picked.length === 1
            ? "Athlete added to group"
            : `${picked.length} athletes added to group`,
        );
        setPicked([]);
        setOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not add athletes");
      }
    });
  }

  async function handleRemove(profileId: string) {
    try {
      await removeAthleteFromGroup(groupId, profileId);
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : "Could not remove athlete",
      };
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{groupName}</CardTitle>
        <CardDescription>
          {coachName ? `Coached by ${coachName}` : "No coach assigned"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {members.length === 0 && (
            <EmptyState title="No athletes yet." className="w-full py-4" />
          )}
          {members.map((m) => (
            <Badge key={m.profileId} variant="secondary" className="gap-1">
              {m.name}
              {canManage && (
                <ConfirmDialog
                  trigger={
                    <button
                      type="button"
                      disabled={pending}
                      aria-label={`Remove ${m.name}`}
                      className="ml-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  }
                  title={`Remove ${m.name} from ${groupName}?`}
                  confirmLabel="Remove"
                  successMessage="Athlete removed from group"
                  onConfirm={() => handleRemove(m.profileId)}
                />
              )}
            </Badge>
          ))}
        </div>
        {canManage && availableAthletes.length > 0 && (
          <Popover
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) setPicked([]);
            }}
          >
            <PopoverTrigger
              render={
                <Button size="sm" variant="outline" className="w-full">
                  <UserPlusIcon className="size-4" />
                  Add athletes…
                </Button>
              }
            />
            <PopoverContent align="start">
              <div className="max-h-64 space-y-0.5 overflow-y-auto">
                {availableAthletes.map((a) => (
                  <label
                    key={a.profileId}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <Checkbox
                      checked={picked.includes(a.profileId)}
                      onCheckedChange={(checked) =>
                        togglePicked(a.profileId, checked === true)
                      }
                    />
                    {a.name}
                  </label>
                ))}
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={handleAdd}
                disabled={picked.length === 0 || pending}
              >
                Add {picked.length > 0 ? picked.length : ""} athlete
                {picked.length === 1 ? "" : "s"}
              </Button>
            </PopoverContent>
          </Popover>
        )}
      </CardContent>
    </Card>
  );
}
