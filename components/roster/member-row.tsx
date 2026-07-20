"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateMemberRole, removeMember } from "@/lib/actions/roster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Role = "head_coach" | "event_coach" | "athlete";

const ROLE_LABEL: Record<Role, string> = {
  head_coach: "Head Coach",
  event_coach: "Event Coach",
  athlete: "Athlete",
};

export function MemberRow({
  teamMemberId,
  name,
  email,
  role,
  canManage,
  isSelf,
}: {
  teamMemberId: string;
  name: string;
  email: string;
  role: Role;
  canManage: boolean;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleRoleChange(value: string | null) {
    if (!value) return;
    startTransition(async () => {
      try {
        await updateMemberRole(teamMemberId, value as Role);
        toast.success("Role updated");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not update role");
      }
    });
  }

  async function handleRemove() {
    try {
      await removeMember(teamMemberId);
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : "Could not remove member",
      };
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        {name}
        {isSelf && (
          <Badge variant="outline" className="ml-2">
            You
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">{email}</TableCell>
      <TableCell>
        {canManage && !isSelf ? (
          <Select value={role} onValueChange={handleRoleChange}>
            <SelectTrigger size="sm">
              <SelectValue>
                {(value: string | null) =>
                  value ? ROLE_LABEL[value as Role] : ""
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="athlete">Athlete</SelectItem>
              <SelectItem value="event_coach">Event Coach</SelectItem>
              <SelectItem value="head_coach">Head Coach</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="secondary">{ROLE_LABEL[role]}</Badge>
        )}
      </TableCell>
      {canManage && (
        <TableCell>
          {!isSelf && (
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="ghost" disabled={pending}>
                  Remove
                </Button>
              }
              title={`Remove ${name} from the team?`}
              description="They'll lose access to team plans, chat, and logs."
              confirmLabel="Remove"
              successMessage="Member removed"
              onConfirm={handleRemove}
            />
          )}
        </TableCell>
      )}
    </TableRow>
  );
}
