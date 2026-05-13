import type { UIMessage } from "ai";

import { messageText, titleFromMessages } from "@/lib/cortex/chat";
import { getUser } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/conversations/[id]/messages">,
) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();

  const { data: conversation, error: conversationError } = await supabase
    .from("cortex_conversations")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (conversationError || !conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("cortex_messages")
    .select("ui_id,role,parts")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    messages: data.map((item) => ({
      id: item.ui_id,
      role: item.role,
      parts: item.parts,
    })),
  });
}

export async function PUT(
  req: Request,
  ctx: RouteContext<"/api/conversations/[id]/messages">,
) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { messages }: { messages?: UIMessage[] } = await req.json();

  if (!Array.isArray(messages)) {
    return Response.json({ error: "Invalid messages" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: conversation, error: conversationError } = await supabase
    .from("cortex_conversations")
    .select("id,title")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (conversationError || !conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .from("cortex_messages")
    .delete()
    .eq("conversation_id", id)
    .eq("user_id", user.id);

  if (deleteError) {
    return Response.json({ error: deleteError.message }, { status: 500 });
  }

  const rows = messages.map((message, index) => ({
    conversation_id: id,
    user_id: user.id,
    ui_id: message.id,
    role: message.role,
    parts: message.parts,
    content: messageText(message),
    position: index,
  }));

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("cortex_messages")
      .insert(rows);

    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 });
    }
  }

  const title =
    conversation.title === "New chat"
      ? titleFromMessages(messages)
      : conversation.title;

  const { error: updateError } = await supabase
    .from("cortex_conversations")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ ok: true, title });
}
