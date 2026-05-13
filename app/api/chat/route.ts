import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { DEFAULT_CORTEX_MODEL, isSupportedModel } from "@/lib/cortex/chat";
import { getUser } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  name: "openrouter",
  headers: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "X-Title": "Cortex",
  },
});

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return Response.json(
      { error: "OpenRouter is not configured." },
      { status: 500 },
    );
  }

  const {
    messages,
    conversationId,
    model,
  }: { messages?: UIMessage[]; conversationId?: string; model?: string } =
    await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "No messages provided." }, { status: 400 });
  }

  const selectedModel = model && isSupportedModel(model) ? model : DEFAULT_CORTEX_MODEL;

  if (conversationId) {
    const supabase = await createSupabaseServerClient();
    const { data: conversation, error } = await supabase
      .from("cortex_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single();

    if (error || !conversation) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }

    await supabase
      .from("cortex_conversations")
      .update({ model: selectedModel, updated_at: new Date().toISOString() })
      .eq("id", conversationId)
      .eq("user_id", user.id);
  }

  const result = streamText({
    model: openrouter.chat(selectedModel),
    system:
      "You are Cortex, a concise AI workspace assistant. Help with planning, writing, debugging, and technical reasoning. Use markdown when it improves readability.",
    messages: await convertToModelMessages(messages.slice(-30)),
    maxOutputTokens: 1600,
  });

  return result.toUIMessageStreamResponse({
    onError: () => "Cortex could not complete that response.",
  });
}
