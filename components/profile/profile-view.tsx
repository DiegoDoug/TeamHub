import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PrEntry } from "@/lib/validation/profile";

export type ProfileDisplay = {
  full_name: string;
  email: string;
  primary_events: string;
  prs: PrEntry[];
};

// Read-only rendering of a profile — used when viewing a teammate's page
// (RLS already limited what we could fetch to profiles sharing a team).
export function ProfileView({ profile }: { profile: ProfileDisplay }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {profile.full_name || "Unnamed athlete"}
        </h1>
        <p className="text-sm text-muted-foreground">{profile.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Primary events</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            {profile.primary_events || (
              <span className="text-muted-foreground">Not set</span>
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal records</CardTitle>
          <CardDescription>
            {profile.prs.length === 0
              ? "No PRs logged yet"
              : `${profile.prs.length} PR${profile.prs.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        {profile.prs.length > 0 && (
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Mark</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profile.prs.map((pr, i) => (
                  <TableRow key={i}>
                    <TableCell>{pr.event}</TableCell>
                    <TableCell>{pr.mark}</TableCell>
                    <TableCell>{pr.date || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
