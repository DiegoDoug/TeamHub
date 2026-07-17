"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile, type ActionState } from "@/lib/actions/profile";
import type { PrEntry, UpdateProfileValues } from "@/lib/validation/profile";
import type { ProfileDisplay } from "@/components/profile/profile-view";

// Rows may be blank while the athlete is still filling them in; only rows
// with something typed in event or mark are sent to the server action.
function isBlankRow(row: PrEntry) {
  return row.event.trim() === "" && row.mark.trim() === "" && !row.date?.trim();
}

export function ProfileForm({
  profile,
}: {
  profile: ProfileDisplay & { id: string };
}) {
  // Bind the profile id so the dispatcher useActionState hands back matches
  // the (prevState, payload) signature it expects.
  const boundUpdateProfile = updateProfile.bind(null, profile.id);
  const [state, formAction, pending] = useActionState<
    ActionState,
    UpdateProfileValues
  >(boundUpdateProfile, null);

  const [fullName, setFullName] = useState(profile.full_name);
  const [primaryEvents, setPrimaryEvents] = useState(profile.primary_events);
  const [prs, setPrs] = useState<PrEntry[]>(profile.prs);

  useEffect(() => {
    if (!state) return;
    if ("error" in state) toast.error(state.error);
    else if ("success" in state) toast.success("Profile updated");
  }, [state]);

  function addRow() {
    setPrs((rows) => [...rows, { event: "", mark: "", date: "" }]);
  }
  function removeRow(index: number) {
    setPrs((rows) => rows.filter((_, i) => i !== index));
  }
  function updateRow(index: number, patch: Partial<PrEntry>) {
    setPrs((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    formAction({
      full_name: fullName,
      primary_events: primaryEvents,
      prs: prs.filter((row) => !isBlankRow(row)),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
        <p className="text-sm text-muted-foreground">{profile.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primary_events">Primary events</Label>
            <Input
              id="primary_events"
              value={primaryEvents}
              onChange={(e) => setPrimaryEvents(e.target.value)}
              placeholder="400m, 4x400 relay"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal records</CardTitle>
          <CardDescription>
            Add your event, mark, and (optionally) the date it was set.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {prs.length === 0 && (
            <p className="text-sm text-muted-foreground">No PRs yet — add one below.</p>
          )}
          {prs.map((pr, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2"
            >
              <div className="space-y-1">
                {i === 0 && <Label className="text-xs">Event</Label>}
                <Input
                  value={pr.event}
                  onChange={(e) => updateRow(i, { event: e.target.value })}
                  placeholder="100m"
                />
              </div>
              <div className="space-y-1">
                {i === 0 && <Label className="text-xs">Mark</Label>}
                <Input
                  value={pr.mark}
                  onChange={(e) => updateRow(i, { mark: e.target.value })}
                  placeholder="10.9"
                />
              </div>
              <div className="space-y-1">
                {i === 0 && <Label className="text-xs">Date (optional)</Label>}
                <Input
                  type="date"
                  value={pr.date ?? ""}
                  onChange={(e) => updateRow(i, { date: e.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove PR"
                onClick={() => removeRow(i)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="size-4" />
            Add PR
          </Button>
        </CardContent>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
