// Pure CSV -> roster-row parsing, deliberately free of "server-only" /
// Supabase imports so it can be unit-tested directly (see
// tests/unit/roster-import.test.ts) without pulling in Next's server
// runtime. lib/actions/roster-import.ts's parseCsvRoster server action is a
// thin wrapper around this.
import Papa from "papaparse";
import {
  importRosterRowsSchema,
  type ImportRosterRow,
} from "@/lib/validation/roster";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string): string {
  const trimmed = value.trim();
  return EMAIL_RE.test(trimmed) ? trimmed : "";
}

export function parseRosterCsvText(
  csvText: string,
): { rows: ImportRosterRow[] } | { error: string } {
  const parsed = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  if (parsed.errors.length > 0) {
    return { error: parsed.errors[0].message };
  }

  const rows: ImportRosterRow[] = parsed.data
    .map((row) => ({
      fullName: (row.name ?? row["full name"] ?? row.athlete ?? "").trim(),
      email: normalizeEmail(row.email ?? ""),
      groupName: (row.group ?? row["event group"] ?? row.event ?? "").trim(),
      role: (/coach/i.test(row.role ?? "") ? "event_coach" : "athlete") as
        | "athlete"
        | "event_coach",
    }))
    .filter((row) => row.fullName.length > 0);

  const result = importRosterRowsSchema.safeParse(rows);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }
  return { rows: result.data };
}
