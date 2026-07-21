"use client";

import { useState, useTransition } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { regenerateJoinCode } from "@/lib/actions/roster-import";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function JoinCodeCard({ initialCode }: { initialCode: string | null }) {
  const [code, setCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleCopy() {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleRegenerate() {
    startTransition(async () => {
      const result = await regenerateJoinCode();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setCode(result.code);
      toast.success("New join code generated");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team join code</CardTitle>
        <CardDescription>
          New athletes enter this after signing up to claim their spot on the
          roster.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <span
          data-testid="join-code"
          className="rounded-md bg-muted px-3 py-1.5 font-mono text-lg tracking-widest"
        >
          {code ?? "—"}
        </span>
        <Button size="sm" variant="outline" onClick={handleCopy} disabled={!code}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRegenerate}
          disabled={pending}
        >
          <RefreshCw className="size-4" />
          {pending ? "Regenerating…" : "Regenerate"}
        </Button>
      </CardContent>
    </Card>
  );
}
