"use server";

import OpenAI from "openai";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/current-team";
import { generateJoinCode } from "@/lib/join-code";
import { parseRosterCsvText } from "@/lib/roster-csv";
import {
  importFromUrlSchema,
  importRosterRowsSchema,
  resolvePendingByEmailSchema,
  type ImportRosterRow,
} from "@/lib/validation/roster";

export type ActionState = { error: string } | null;

const MAX_FETCH_BYTES = 2_000_000; // cap on the fetched page's raw size
const MAX_EXTRACT_CHARS = 40_000; // keep the LLM prompt (and cost) bounded
const JOIN_CODE_UPDATE_ATTEMPTS = 5;

// Rejects non-http(s) schemes and obvious loopback/private-network hosts so
// the server-side fetch in fetchAndExtractRosterFromUrl can't be pointed at
// internal infrastructure (SSRF). Best-effort — it checks the literal
// hostname, not resolved DNS, which is enough for this feature's threat
// model (a head coach pasting a public athletics roster URL).
function assertSafeHttpUrl(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http/https URLs are supported.");
  }
  const hostname = url.hostname.toLowerCase();
  const blocked =
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    /^192\.168\./.test(hostname);
  if (blocked) {
    throw new Error("That URL isn't reachable from here.");
  }
  return url;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

// Pure parsing, no DB writes — the caller reviews/edits the result before
// calling importRosterRows. Delegates to lib/roster-csv.ts so the parsing
// logic itself stays unit-testable outside Next's server runtime.
export async function parseCsvRoster(
  csvText: string,
): Promise<{ rows: ImportRosterRow[] } | { error: string }> {
  return parseRosterCsvText(csvText);
}

// Fetches the page server-side (keeps CORS and the coach's browser out of
// it) and asks an LLM to extract structured rows, since athletics roster
// sites vary too widely by vendor (Sidearm, PrestoSports, custom) for a
// hand-rolled per-site parser to keep up.
export async function fetchAndExtractRosterFromUrl(
  urlInput: string,
): Promise<{ rows: ImportRosterRow[] } | { error: string }> {
  const parsed = importFromUrlSchema.safeParse({ url: urlInput });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (!process.env.DEEPSEEK_API_KEY) {
    return {
      error:
        "URL import isn't configured on this server yet — paste a CSV instead, or ask an admin to set DEEPSEEK_API_KEY.",
    };
  }

  let url: URL;
  try {
    url = assertSafeHttpUrl(parsed.data.url);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid URL." };
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "TrackHubRosterImport/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { error: `Couldn't fetch that page (${res.status}).` };
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_FETCH_BYTES) {
      return { error: "That page is too large to import from." };
    }
    html = new TextDecoder().decode(buffer);
  } catch {
    return { error: "Couldn't fetch that page. Check the URL and try again." };
  }

  const text = htmlToText(html).slice(0, MAX_EXTRACT_CHARS);
  if (text.length < 20) {
    return { error: "That page didn't have any readable roster content." };
  }

  // DeepSeek exposes an OpenAI-compatible Chat Completions API, so the
  // official `openai` client works unmodified against it — just point
  // baseURL at DeepSeek instead of OpenAI.
  const deepseek = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
  });

  let response;
  try {
    response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      max_tokens: 4096,
      tools: [
        {
          type: "function",
          function: {
            name: "record_roster",
            description:
              "Record the athletes and coaches found on a team roster page.",
            parameters: {
              type: "object",
              properties: {
                people: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      fullName: { type: "string" },
                      groupName: {
                        type: "string",
                        description:
                          "Event/position group as labeled on the page, e.g. 'Sprints', 'Distance', 'Throws', 'Jumps', 'Multis'. Empty string if the page doesn't group people.",
                      },
                      role: {
                        type: "string",
                        enum: ["athlete", "event_coach"],
                      },
                    },
                    required: ["fullName", "groupName", "role"],
                  },
                },
              },
              required: ["people"],
            },
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: { name: "record_roster" },
      },
      messages: [
        {
          role: "user",
          content:
            'Extract every athlete and coach listed on this team roster page into a structured list, with their event/position group if the page organizes people that way. Use "athlete" as the role unless the page clearly labels someone as a coach.\n\n' +
            text,
        },
      ],
    });
  } catch {
    return { error: "Couldn't extract a roster from that page right now." };
  }

  const toolCall = response.choices[0]?.message?.tool_calls?.find(
    (call): call is OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall =>
      call.type === "function" && call.function.name === "record_roster",
  );

  let people: Record<string, unknown>[] = [];
  try {
    const args = toolCall?.function.arguments;
    people = args ? ((JSON.parse(args).people ?? []) as Record<string, unknown>[]) : [];
  } catch {
    return { error: "Couldn't extract a roster from that page right now." };
  }

  const rows: ImportRosterRow[] = people
    .map((p) => ({
      fullName: String(p.fullName ?? "").trim(),
      email: "",
      groupName: String(p.groupName ?? "").trim(),
      role: (p.role === "event_coach" ? "event_coach" : "athlete") as
        | "athlete"
        | "event_coach",
    }))
    .filter((row) => row.fullName.length > 0);

  const result = importRosterRowsSchema.safeParse(rows);
  if (!result.success) {
    return { error: "Didn't find a usable roster on that page." };
  }
  return { rows: result.data };
}

// Commits reviewed rows: emails that match an existing account go straight
// into team_members (+ event_group_members); everything else becomes a
// pending_roster_members placeholder claimed later via join code.
export async function importRosterRows(
  rowsInput: ImportRosterRow[],
  source: "csv" | "url" | "manual",
): Promise<{ error: string } | { addedDirectly: number; pending: number }> {
  const parsed = importRosterRowsSchema.safeParse(rowsInput);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const rows = parsed.data;

  const team = await getCurrentTeam();
  if (!team) return { error: "No team found." };
  if (team.role !== "head_coach") {
    return { error: "Only the head coach can import a roster." };
  }

  const supabase = await createClient();

  const { data: existingGroups } = await supabase
    .from("event_groups")
    .select("id, name")
    .eq("team_id", team.teamId);

  const groupIdByName = new Map(
    (existingGroups ?? []).map((g) => [g.name.trim().toLowerCase(), g.id]),
  );

  const wantedGroupNames = [
    ...new Set(
      rows
        .map((r) => (r.groupName ?? "").trim())
        .filter((n) => n.length > 0 && !groupIdByName.has(n.toLowerCase())),
    ),
  ];
  if (wantedGroupNames.length > 0) {
    const { data: createdGroups, error: groupError } = await supabase
      .from("event_groups")
      .insert(wantedGroupNames.map((name) => ({ team_id: team.teamId, name })))
      .select("id, name");
    if (groupError) return { error: groupError.message };
    for (const g of createdGroups ?? []) {
      groupIdByName.set(g.name.trim().toLowerCase(), g.id);
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let addedDirectly = 0;
  const pendingRows: {
    team_id: string;
    event_group_id: string | null;
    full_name: string;
    role: "athlete" | "event_coach";
    source: "csv" | "url" | "manual";
    created_by: string | undefined;
  }[] = [];

  for (const row of rows) {
    const trimmedGroup = (row.groupName ?? "").trim();
    const eventGroupId = trimmedGroup
      ? (groupIdByName.get(trimmedGroup.toLowerCase()) ?? null)
      : null;

    if (row.email) {
      const { data: found } = await supabase
        .rpc("lookup_profile_by_email", { p_email: row.email })
        .maybeSingle();
      if (found) {
        const { error: memberError } = await supabase.from("team_members").insert({
          team_id: team.teamId,
          profile_id: found.id,
          role: row.role,
        });
        if (!memberError) {
          addedDirectly++;
          if (eventGroupId) {
            await supabase.from("event_group_members").upsert(
              { event_group_id: eventGroupId, profile_id: found.id },
              { onConflict: "event_group_id,profile_id", ignoreDuplicates: true },
            );
          }
          continue;
        }
        // Already on the team, or some other insert issue — fall through
        // to a pending row so the coach still sees the name and can sort
        // it out from the roster page instead of the import silently
        // dropping them.
      }
    }

    pendingRows.push({
      team_id: team.teamId,
      event_group_id: eventGroupId,
      full_name: row.fullName,
      role: row.role,
      source,
      created_by: user?.id,
    });
  }

  if (pendingRows.length > 0) {
    const { error: pendingError } = await supabase
      .from("pending_roster_members")
      .insert(pendingRows);
    if (pendingError) return { error: pendingError.message };
  }

  revalidatePath("/team/roster");
  return { addedDirectly, pending: pendingRows.length };
}

export async function regenerateJoinCode(): Promise<
  { code: string } | { error: string }
> {
  const team = await getCurrentTeam();
  if (!team) return { error: "No team found." };
  if (team.role !== "head_coach") {
    return { error: "Only the head coach can do that." };
  }

  const supabase = await createClient();
  for (let attempt = 0; attempt < JOIN_CODE_UPDATE_ATTEMPTS; attempt++) {
    const code = generateJoinCode();
    const { error } = await supabase
      .from("teams")
      .update({ join_code: code })
      .eq("id", team.teamId);
    if (!error) {
      revalidatePath("/team/roster");
      return { code };
    }
    if (error.code !== "23505") return { error: error.message };
  }
  return { error: "Couldn't generate a new code — try again." };
}

export async function removePendingMember(pendingId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pending_roster_members")
    .delete()
    .eq("id", pendingId);
  if (error) throw new Error(error.message);
  revalidatePath("/team/roster");
}

// Binds a pending row straight to an existing account — for when the coach
// finds out the athlete already has one, without waiting for them to claim
// it via the join code themselves.
export async function resolvePendingMemberByEmail(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const pendingId = String(formData.get("pendingId") ?? "");
  const parsed = resolvePendingByEmailSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!pendingId) return { error: "Missing pending member." };

  const supabase = await createClient();

  const { data: pendingRow, error: pendingFetchError } = await supabase
    .from("pending_roster_members")
    .select("id, team_id, event_group_id, role, status")
    .eq("id", pendingId)
    .maybeSingle();
  if (pendingFetchError) return { error: pendingFetchError.message };
  if (!pendingRow || pendingRow.status !== "pending") {
    return { error: "That roster slot is no longer pending." };
  }

  const { data: found, error: lookupError } = await supabase
    .rpc("lookup_profile_by_email", { p_email: parsed.data.email })
    .maybeSingle();
  if (lookupError) return { error: lookupError.message };
  if (!found) {
    return {
      error: "No account found for that email — they need to sign up first.",
    };
  }

  const { error: memberError } = await supabase.from("team_members").insert({
    team_id: pendingRow.team_id,
    profile_id: found.id,
    role: pendingRow.role,
  });
  if (memberError) {
    if (memberError.code === "23505") {
      return { error: "That person is already on the team." };
    }
    return { error: memberError.message };
  }

  if (pendingRow.event_group_id) {
    await supabase.from("event_group_members").upsert(
      { event_group_id: pendingRow.event_group_id, profile_id: found.id },
      { onConflict: "event_group_id,profile_id", ignoreDuplicates: true },
    );
  }

  const { error: deleteError } = await supabase
    .from("pending_roster_members")
    .delete()
    .eq("id", pendingId);
  if (deleteError) return { error: deleteError.message };

  revalidatePath("/team/roster");
  return null;
}
