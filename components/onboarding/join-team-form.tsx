"use client";

import { useActionState, useState, useTransition } from "react";
import {
  lookupTeamByJoinCode,
  claimRosterSlot,
  type ActionState,
  type PendingRosterEntry,
} from "@/lib/actions/join-team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function JoinTeamForm({ fallbackEmail }: { fallbackEmail: string }) {
  const [step, setStep] = useState<"code" | "pick">("code");
  const [code, setCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [entries, setEntries] = useState<PendingRosterEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupPending, startLookup] = useTransition();

  const [claimState, claimAction, claimPending] = useActionState<
    ActionState,
    FormData
  >(claimRosterSlot, null);

  function handleLookup(formData: FormData) {
    setLookupError(null);
    const raw = String(formData.get("code") ?? "");
    startLookup(async () => {
      const result = await lookupTeamByJoinCode(raw);
      if ("error" in result) {
        setLookupError(result.error);
        return;
      }
      setCode(raw.trim().toUpperCase());
      setTeamName(result.teamName);
      setEntries(result.entries);
      setSelectedId(null);
      setStep("pick");
    });
  }

  if (step === "code") {
    return (
      <form action={handleLookup} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="join-code">Join code</Label>
          <Input
            id="join-code"
            name="code"
            placeholder="ABC123"
            className="uppercase"
            required
            minLength={4}
          />
          <p className="text-xs text-muted-foreground">
            Get this from your head coach.
          </p>
        </div>
        {lookupError && (
          <p className="text-sm text-destructive">{lookupError}</p>
        )}
        <Button type="submit" className="w-full" disabled={lookupPending}>
          {lookupPending ? "Looking up…" : "Find my team"}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Joining <strong>{teamName}</strong>. Pick your name below.
      </p>
      {entries.length > 0 && (
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-1">
          {entries.map((entry) => (
            <button
              key={entry.pendingId}
              type="button"
              onClick={() => setSelectedId(entry.pendingId)}
              className={cn(
                "w-full rounded-sm px-3 py-2 text-left text-sm transition-colors",
                selectedId === entry.pendingId
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
            >
              {entry.fullName}
              {entry.eventGroupName && (
                <span className="ml-2 text-xs opacity-70">
                  {entry.eventGroupName}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        {entries.length === 0
          ? "Your coach hasn't added a pending roster yet. "
          : "Don't see your name? "}
        Ask your head coach to add <strong>{fallbackEmail}</strong> to the
        roster instead.
      </p>
      <form action={claimAction} className="space-y-3">
        <input type="hidden" name="pendingId" value={selectedId ?? ""} />
        <input type="hidden" name="code" value={code} />
        {claimState?.error && (
          <p className="text-sm text-destructive">{claimState.error}</p>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => setStep("code")}
          >
            Back
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={claimPending || !selectedId}
          >
            {claimPending ? "Joining…" : "That's me"}
          </Button>
        </div>
      </form>
    </div>
  );
}
