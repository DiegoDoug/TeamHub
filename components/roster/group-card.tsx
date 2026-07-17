"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { addAthleteToGroup, removeAthleteFromGroup } from "@/lib/actions/roster";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [picked, setPicked] = useState("");

  function handleAdd() {
    if (!picked) return;
    startTransition(async () => {
      try {
        await addAthleteToGroup(groupId, picked);
        setPicked("");
        toast.success("Athlete added to group");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not add athlete");
      }
    });
  }

  function handleRemove(profileId: string) {
    startTransition(async () => {
      try {
        await removeAthleteFromGroup(groupId, profileId);
        toast.success("Athlete removed from group");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not remove athlete");
      }
    });
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
            <p className="text-sm text-muted-foreground">No athletes yet.</p>
          )}
          {members.map((m) => (
            <Badge key={m.profileId} variant="secondary" className="gap-1">
              {m.name}
              {canManage && (
                <button
                  type="button"
                  onClick={() => handleRemove(m.profileId)}
                  disabled={pending}
                  aria-label={`Remove ${m.name}`}
                  className="ml-0.5"
                >
                  <X className="size-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
        {canManage && availableAthletes.length > 0 && (
          <div className="flex items-center gap-2">
            <Select
              value={picked}
              onValueChange={(value) => setPicked(value ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Add an athlete…" />
              </SelectTrigger>
              <SelectContent>
                {availableAthletes.map((a) => (
                  <SelectItem key={a.profileId} value={a.profileId}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAdd} disabled={!picked || pending}>
              Add
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
