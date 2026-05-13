import { DEFAULT_CORTEX_MODEL, isSupportedModel } from "@/lib/cortex/chat";
import { getUser } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cortex_conversations")
    .select("id,title,model,created_at,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(40);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    conversations: data.map((item) => ({
      id: item.id,
      title: item.title,
      model: item.model,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    })),
  });
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    model?: string;
  };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cortex_conversations")
    .insert({
      user_id: user.id,
      title: body.title?.trim() || "New chat",
      model:
        body.model && isSupportedModel(body.model)
          ? body.model
          : DEFAULT_CORTEX_MODEL,
    })
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
