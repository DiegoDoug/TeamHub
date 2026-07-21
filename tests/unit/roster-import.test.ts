import { describe, it, expect } from "vitest";
import { parseRosterCsvText as parseCsvRoster } from "@/lib/roster-csv";

describe("parseRosterCsvText", () => {
  it("parses name/email/group/role columns, case-insensitive headers", async () => {
    const csv = `Name,Email,Group,Role
Jordan Diaz,jordan@example.com,Sprints,athlete
Casey Park,,Throws,event_coach`;

    const result = await parseCsvRoster(csv);
    expect("rows" in result).toBe(true);
    if (!("rows" in result)) return;

    expect(result.rows).toEqual([
      {
        fullName: "Jordan Diaz",
        email: "jordan@example.com",
        groupName: "Sprints",
        role: "athlete",
      },
      {
        fullName: "Casey Park",
        email: "",
        groupName: "Throws",
        role: "event_coach",
      },
    ]);
  });

  it("handles quoted commas inside a name", async () => {
    const csv = `name,email,group,role\n"Smith, Jr.",,Distance,athlete`;
    const result = await parseCsvRoster(csv);
    expect("rows" in result).toBe(true);
    if (!("rows" in result)) return;
    expect(result.rows[0].fullName).toBe("Smith, Jr.");
  });

  it("defaults role to athlete and group to empty when those columns are missing", async () => {
    const csv = `name,email\nSam Lee,sam@example.com`;
    const result = await parseCsvRoster(csv);
    expect("rows" in result).toBe(true);
    if (!("rows" in result)) return;
    expect(result.rows[0]).toEqual({
      fullName: "Sam Lee",
      email: "sam@example.com",
      groupName: "",
      role: "athlete",
    });
  });

  it("skips blank rows and rows with no name", async () => {
    const csv = `name,email,group,role\n,ghost@example.com,Sprints,athlete\n\nReal Person,,,athlete`;
    const result = await parseCsvRoster(csv);
    expect("rows" in result).toBe(true);
    if (!("rows" in result)) return;
    expect(result.rows.map((r) => r.fullName)).toEqual(["Real Person"]);
  });

  it("drops a malformed email instead of failing the whole import", async () => {
    const csv = `name,email,group,role\nJamie Fox,not-an-email,Jumps,athlete`;
    const result = await parseCsvRoster(csv);
    expect("rows" in result).toBe(true);
    if (!("rows" in result)) return;
    expect(result.rows[0].email).toBe("");
  });

  it("returns an error for an empty CSV", async () => {
    const result = await parseCsvRoster("name,email,group,role");
    expect("error" in result).toBe(true);
  });
});
