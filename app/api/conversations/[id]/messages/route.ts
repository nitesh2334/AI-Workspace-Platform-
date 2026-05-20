import { titleFromMessages } from "@/lib/cortex/chat";
import { getUser } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/cortex/rate-limit";
import {
  parseRequestBody,
  saveMessagesSchema,
} from "@/lib/cortex/validation";

export async function GET(
  req: Request,
  ctx: RouteContext<"/api/conversations/[id]/messages">,
) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspace_id");

  const supabase = await createSupabaseServerClient();

  let conversationQuery = supabase
    .from("cortex_conversations")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id);

  if (workspaceId) {
    conversationQuery = conversationQuery.eq("workspace_id", workspaceId);
  }

  const { data: conversation, error: conversationError } = await conversationQuery.single();

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

  const rateLimitResult = await checkRateLimit(user.id);
  if (!rateLimitResult.ok) {
    return Response.json(
      { error: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimitResult.retryAfter) },
      },
    );
  }

  const parsed = await parseRequestBody(req, saveMessagesSchema, 2_097_152);
  if ("errorResponse" in parsed) return parsed.errorResponse;
  const { messages } = parsed.data;

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

  // Atomic replace: delete + insert in a single DB transaction
  const { error: rpcError } = await supabase.rpc(
    "replace_conversation_messages",
    {
      p_conversation_id: id,
      p_user_id: user.id,
      p_messages: messages,
    },
  );

  if (rpcError) {
    return Response.json({ error: rpcError.message }, { status: 500 });
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
