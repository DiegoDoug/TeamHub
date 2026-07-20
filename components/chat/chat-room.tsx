"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { sendMessage, type SendMessageState } from "@/lib/actions/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  senderName: string;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function ChatRoom({
  channelId,
  channelName,
  currentUserId,
  currentUserName,
  initialMessages,
  initialHasMore,
  memberNames,
}: {
  channelId: string;
  channelName: string;
  currentUserId: string;
  currentUserName: string;
  initialMessages: ChatMessage[];
  initialHasMore: boolean;
  memberNames: Record<string, string>;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [state, formAction, pending] = useActionState<SendMessageState, FormData>(
    sendMessage,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const skipAutoScrollRef = useRef(false);
  // A ref guard (not the `loadingMore` state) so a rapid double-click can't
  // both pass the check before React commits the first setLoadingMore(true).
  const loadingMoreRef = useRef(false);

  async function loadOlder() {
    if (messages.length === 0 || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const container = scrollRef.current;
    const prevHeight = container?.scrollHeight ?? 0;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages")
      .select("id, content, created_at, sender_id, profiles(full_name)")
      .eq("channel_id", channelId)
      .lt("created_at", messages[0].createdAt)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast.error("Couldn't load older messages");
      loadingMoreRef.current = false;
      setLoadingMore(false);
      return;
    }

    const older: ChatMessage[] = (data ?? [])
      .map((m) => {
        const profile = m.profiles as unknown as { full_name: string } | null;
        return {
          id: m.id,
          content: m.content,
          createdAt: m.created_at,
          senderId: m.sender_id,
          senderName: profile?.full_name || memberNames[m.sender_id] || "Unknown",
        };
      })
      .reverse();

    setHasMore(older.length === 50);
    skipAutoScrollRef.current = true;
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      return [...older.filter((m) => !existingIds.has(m.id)), ...prev];
    });
    loadingMoreRef.current = false;
    setLoadingMore(false);

    // Keep the viewport anchored on the same messages instead of jumping to
    // the top now that older content was prepended above it.
    requestAnimationFrame(() => {
      if (container) container.scrollTop = container.scrollHeight - prevHeight;
    });
  }

  // Surface send errors, and clear the composer after a successful send.
  // The sent message itself is added to the list via the Realtime INSERT
  // event below (which fires for our own inserts too), not here — appending
  // it in both places would produce duplicates.
  useEffect(() => {
    if (state && "error" in state) {
      toast.error(state.error);
    } else if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  useEffect(() => {
    if (skipAutoScrollRef.current) {
      skipAutoScrollRef.current = false;
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Live message delivery: subscribe to INSERTs on `messages` scoped to this
  // channel via Realtime. The payload only carries raw columns (no joined
  // sender name), so we resolve the name from `memberNames` (fetched once,
  // team-wide, by the server component) or from the current user's own name.
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    // Realtime's postgres_changes authorizes each subscriber against RLS
    // using the token passed to `realtime.setAuth()` — which the client
    // only syncs automatically on auth state *changes*, not on this
    // freshly-constructed client's initial (already-logged-in) session.
    // Subscribing before that sync lands means Realtime treats us as
    // anon (no grants on `messages`), so every change is silently
    // filtered out with no client-visible error. Explicitly setting it
    // from the current session before subscribing avoids that race.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`messages:${channelId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `channel_id=eq.${channelId}`,
          },
          (payload) => {
            const row = payload.new as {
              id: string;
              content: string;
              created_at: string;
              sender_id: string;
            };
            const senderName =
              row.sender_id === currentUserId
                ? currentUserName
                : (memberNames[row.sender_id] ?? "Unknown");

            setMessages((prev) =>
              prev.some((m) => m.id === row.id)
                ? prev
                : [
                    ...prev,
                    {
                      id: row.id,
                      content: row.content,
                      createdAt: row.created_at,
                      senderId: row.sender_id,
                      senderName,
                    },
                  ],
            );
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  return (
    <div className="flex h-[calc(100svh-14rem)] min-h-[420px] flex-col">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">{channelName}</h1>

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto rounded-lg border p-4"
      >
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">No messages yet. Say hello.</p>
        )}
        {hasMore && (
          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={loadOlder}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading…" : "Load older messages"}
            </Button>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <div className="flex items-baseline gap-2">
              <span className="font-medium">
                {m.senderId === currentUserId ? "You" : m.senderName}
              </span>
              <span className="text-xs text-muted-foreground">{formatTime(m.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap break-words text-foreground">{m.content}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form ref={formRef} action={formAction} className="mt-3 flex gap-2">
        <input type="hidden" name="channel_id" value={channelId} />
        <Input name="content" placeholder="Message" autoComplete="off" required />
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send"}
        </Button>
      </form>
    </div>
  );
}
