import { isSupportedModel } from "@/lib/cortex/chat";
import { getUser } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  parseRequestBody,
  updateConversationSchema,
} from "@/lib/cortex/validation";

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/conversations/[id]">,
) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const parsed = await parseRequestBody(req, updateConversationSchema);
  if ("errorResponse" in parsed) return parsed.errorResponse;
  const { title: rawTitle, model: rawModel } = parsed.data;

  const patch: { title?: string; model?: string; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };

  if (rawTitle) {
    patch.title = rawTitle.trim().slice(0, 80) || "New chat";
  }

  if (rawModel && isSupportedModel(rawModel)) {
    patch.model = rawModel;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cortex_conversations")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id,title,model,created_at,updated_at")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    conversation: {
      id: data.id,
      title: data.title,
      model: data.model,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  });
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/conversations/[id]">,
) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("cortex_conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
