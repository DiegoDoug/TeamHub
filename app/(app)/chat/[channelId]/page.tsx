import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/current-team";
import { ChatRoom, type ChatMessage } from "@/components/chat/chat-room";

export default async function ChatChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;

  const team = await getCurrentTeam();
  if (!team) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // (app)/layout.tsx already redirects unauthenticated users

  // RLS (channels_select) returns this row only if the user can access the
  // channel (team member for 'team' channels; group coach/member for
  // 'event_group' channels). No row back means no access -> 404, same as
  // a channel that doesn't exist.
  const { data: channel } = await supabase
    .from("channels")
    .select("id, name, type")
    .eq("id", channelId)
    .maybeSingle();

  if (!channel) notFound();

  // Chat participants are always team members, so a single team-wide
  // profile_id -> full_name map covers every sender we'll ever need to
  // display, including for the live Realtime INSERT payloads (which don't
  // carry a joined sender name).
  const [{ data: messagesDesc }, { data: members }] = await Promise.all([
    // Most recent 50 first, then reversed below to chronological order for
    // display — ordering ascending+limit here would instead return the
    // OLDEST 50 messages ever sent, hiding everything newer once a channel
    // passes 50 messages.
    supabase
      .from("messages")
      .select("id, content, created_at, sender_id, profiles(full_name)")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("team_members")
      .select("profile_id, profiles(full_name)")
      .eq("team_id", team.teamId),
  ]);
  const messages = messagesDesc ? [...messagesDesc].reverse() : messagesDesc;

  const memberNames: Record<string, string> = {};
  for (const m of members ?? []) {
    const profile = m.profiles as unknown as { full_name: string } | null;
    memberNames[m.profile_id] = profile?.full_name || "Unknown";
  }

  const initialMessages: ChatMessage[] = (messages ?? []).map((m) => {
    const profile = m.profiles as unknown as { full_name: string } | null;
    return {
      id: m.id,
      content: m.content,
      createdAt: m.created_at,
      senderId: m.sender_id,
      senderName: profile?.full_name || memberNames[m.sender_id] || "Unknown",
    };
  });

  return (
    <ChatRoom
      channelId={channel.id}
      channelName={channel.name}
      currentUserId={user.id}
      currentUserName={memberNames[user.id] || "You"}
      initialMessages={initialMessages}
      initialHasMore={initialMessages.length === 50}
      memberNames={memberNames}
    />
  );
}
