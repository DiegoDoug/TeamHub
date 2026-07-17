import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/current-team";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CHANNEL_TYPE_LABEL: Record<string, string> = {
  team: "Team channel",
  event_group: "Event group channel",
};

export default async function ChatIndexPage() {
  const team = await getCurrentTeam();
  if (!team) return null;

  const supabase = await createClient();
  // RLS (channels_select) already restricts rows to channels this user can
  // access: their team's 'team' channel, plus 'event_group' channels for
  // groups they coach or belong to.
  const { data: channels } = await supabase
    .from("channels")
    .select("id, name, type")
    .eq("team_id", team.teamId)
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>

      {(channels ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No channels yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(channels ?? []).map((channel) => (
            <Link key={channel.id} href={`/chat/${channel.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="size-4 text-muted-foreground" />
                    {channel.name}
                  </CardTitle>
                  <CardDescription>
                    {CHANNEL_TYPE_LABEL[channel.type] ?? channel.type}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
