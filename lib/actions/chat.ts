"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type SendMessageState = { error: string } | { success: true } | null;

const sendMessageSchema = z.object({
  channel_id: z.string().uuid(),
  content: z.string().trim().min(1, "Message cannot be empty"),
});

// Posts a plain-text message to a channel. RLS (messages_insert) already
// enforces sender_id = auth.uid() and channel access via
// app_can_access_channel(channel_id) — we set sender_id explicitly too so
// the insert can't be spoofed to another sender via a tampered form field.
// The message itself reaches the UI via the Realtime postgres_changes
// subscription in components/chat/chat-room.tsx, not this action's return
// value, so callers should not append locally on success.
export async function sendMessage(
  _prevState: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const parsed = sendMessageSchema.safeParse({
    channel_id: formData.get("channel_id"),
    content: formData.get("content"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const { error } = await supabase.from("messages").insert({
    channel_id: parsed.data.channel_id,
    sender_id: user.id,
    content: parsed.data.content,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
