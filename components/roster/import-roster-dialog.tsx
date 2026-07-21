"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  parseCsvRoster,
  fetchAndExtractRosterFromUrl,
  importRosterRows,
} from "@/lib/actions/roster-import";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type EditableRow = {
  fullName: string;
  email: string;
  groupName: string;
  role: "athlete" | "event_coach";
};

const CSV_PLACEHOLDER = `name,email,group,role
Jordan Diaz,,Sprints,athlete
Sam Lee,sam@example.com,Distance,athlete
Casey Park,,Throws,event_coach`;

export function ImportRosterDialog({
  eventGroupNames,
}: {
  eventGroupNames: string[];
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"input" | "preview">("input");
  const [source, setSource] = useState<"csv" | "url">("csv");
  const [csvText, setCsvText] = useState("");
  const [urlText, setUrlText] = useState("");
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setStep("input");
    setCsvText("");
    setUrlText("");
    setRows([]);
    setError(null);
  }

  function handleParseCsv() {
    setError(null);
    startTransition(async () => {
      const result = await parseCsvRoster(csvText);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSource("csv");
      setRows(result.rows.map(toEditableRow));
      setStep("preview");
    });
  }

  function handleFetchUrl() {
    setError(null);
    startTransition(async () => {
      const result = await fetchAndExtractRosterFromUrl(urlText);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSource("url");
      setRows(result.rows.map(toEditableRow));
      setStep("preview");
    });
  }

  function updateRow(index: number, patch: Partial<EditableRow>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function addBlankRow() {
    setRows((prev) => [
      ...prev,
      { fullName: "", email: "", groupName: "", role: "athlete" },
    ]);
  }

  function handleImport() {
    setError(null);
    const cleanRows = rows
      .map((row) => ({ ...row, fullName: row.fullName.trim() }))
      .filter((row) => row.fullName.length > 0);

    if (cleanRows.length === 0) {
      setError("Add at least one person before importing.");
      return;
    }

    startTransition(async () => {
      const result = await importRosterRows(cleanRows, source);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      const parts: string[] = [];
      if (result.addedDirectly > 0) {
        parts.push(`${result.addedDirectly} added directly`);
      }
      if (result.pending > 0) {
        parts.push(`${result.pending} pending claim`);
      }
      toast.success(`Imported roster — ${parts.join(", ")}`);
      setOpen(false);
      reset();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button data-slot="dialog-trigger" variant="outline">
            Import roster
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import roster</DialogTitle>
          <DialogDescription>
            {step === "input"
              ? "Paste a CSV, or fetch a team's public roster page. You'll review everything before it's added."
              : "Review and edit before importing. Rows without an email become pending until the athlete signs up and claims their name via your team's join code."}
          </DialogDescription>
        </DialogHeader>

        {step === "input" ? (
          <Tabs defaultValue="csv">
            <TabsList>
              <TabsTrigger value="csv">Paste CSV</TabsTrigger>
              <TabsTrigger value="url">Fetch from URL</TabsTrigger>
            </TabsList>
            <TabsContent value="csv" className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="roster-csv">CSV (name, email, group, role)</Label>
                <Textarea
                  id="roster-csv"
                  rows={8}
                  placeholder={CSV_PLACEHOLDER}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  email, group, and role columns are optional. role defaults to
                  athlete.
                </p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="button"
                onClick={handleParseCsv}
                disabled={pending || csvText.trim().length === 0}
              >
                {pending ? "Parsing…" : "Parse CSV"}
              </Button>
            </TabsContent>
            <TabsContent value="url" className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="roster-url">Team roster page URL</Label>
                <Input
                  id="roster-url"
                  type="url"
                  placeholder="https://goteam.com/sports/track/roster"
                  value={urlText}
                  onChange={(e) => setUrlText(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  We&apos;ll read the page and pull out names and event groups.
                  This can take a few seconds.
                </p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="button"
                onClick={handleFetchUrl}
                disabled={pending || urlText.trim().length === 0}
              >
                {pending ? "Fetching…" : "Fetch roster"}
              </Button>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-3">
            <div className="max-h-80 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={row.fullName}
                          onChange={(e) =>
                            updateRow(index, { fullName: e.target.value })
                          }
                          className="h-8 min-w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="email"
                          value={row.email}
                          placeholder="optional"
                          onChange={(e) =>
                            updateRow(index, { email: e.target.value })
                          }
                          className="h-8 min-w-40"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          list="roster-import-group-names"
                          value={row.groupName}
                          placeholder="optional"
                          onChange={(e) =>
                            updateRow(index, { groupName: e.target.value })
                          }
                          className="h-8 min-w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.role}
                          onValueChange={(value) =>
                            updateRow(index, {
                              role: value as "athlete" | "event_coach",
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="athlete">Athlete</SelectItem>
                            <SelectItem value="event_coach">
                              Event Coach
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => removeRow(index)}
                        >
                          <X className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <datalist id="roster-import-group-names">
                {eventGroupNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addBlankRow}>
              Add row
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          {step === "preview" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("input")}
              disabled={pending}
            >
              Back
            </Button>
          )}
          <DialogClose
            render={
              <Button type="button" data-slot="dialog-close" variant="outline" />
            }
          >
            Cancel
          </DialogClose>
          {step === "preview" && (
            <Button type="button" onClick={handleImport} disabled={pending}>
              {pending ? "Importing…" : `Import ${rows.length} people`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toEditableRow(row: {
  fullName: string;
  email?: string;
  groupName?: string;
  role: "athlete" | "event_coach";
}): EditableRow {
  return {
    fullName: row.fullName,
    email: row.email ?? "",
    groupName: row.groupName ?? "",
    role: row.role,
  };
}
