import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText } from "ai";

import { DEFAULT_CORTEX_MODEL, isSupportedModel } from "@/lib/cortex/chat";
import { getUser } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/cortex/rate-limit";
import { recordUsage } from "@/lib/cortex/usage";
import { chatSchema, parseRequestBody } from "@/lib/cortex/validation";
import { searchRelevantChunks } from "@/lib/cortex/rag";
import { getMemoryForContext } from "@/lib/cortex/memory";

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

  if (!process.env.OPENROUTER_API_KEY) {
    return Response.json(
      { error: "OpenRouter is not configured." },
      { status: 500 },
    );
  }

  const parsed = await parseRequestBody(req, chatSchema);
  if ("errorResponse" in parsed) return parsed.errorResponse;
  const { messages, conversationId, model, workspace_id } = parsed.data;
  const workspaceId = workspace_id;

  const selectedModel = model && isSupportedModel(model) ? model : DEFAULT_CORTEX_MODEL;

  const supabase = await createSupabaseServerClient();

  if (conversationId) {
    let query = supabase
      .from("cortex_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", user.id);

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    const { data: conversation, error } = await query.single();

    if (error || !conversation) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }

    await supabase
      .from("cortex_conversations")
      .update({ model: selectedModel, updated_at: new Date().toISOString() })
      .eq("id", conversationId)
      .eq("user_id", user.id);
  }

  // Extract the latest user message for RAG + memory context
  const latestUserMsg = messages
    .filter((m: { role: string }) => m.role === "user")
    .pop();
  const latestQuery =
    latestUserMsg && typeof latestUserMsg === "object"
      ? ((latestUserMsg as { content?: string }).content ??
        ((latestUserMsg as { parts?: Array<{ type: string; text: string }> }).parts
          ?.filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("") || ""))
      : "";

  // ─── RAG: retrieve relevant document chunks for the latest user message ───
  let ragContext = "";
  try {
    if (latestQuery) {
      const chunks = await searchRelevantChunks(supabase, user.id, latestQuery, {
        limit: 4,
        minSimilarity: 0.45,
        workspaceId,
      });

      if (chunks.length > 0) {
        ragContext =
          "\n\nUse the following document context to help answer the user's question when relevant.\n\nRelevant context from your documents:\n" +
          chunks
            .map(
              (chunk, i) =>
                `[${i + 1}] (from "${chunk.documentFilename}")\n${chunk.content}`,
            )
            .join("\n\n---\n\n");
      }
    }
  } catch {
    // RAG errors are non-fatal — the chat still works without document context
    console.error("[rag] Retrieval failed");
  }

  // ─── Memory Retrieval ───────────────────────────────
  let memoryContext = "";
  try {
    const memoryResult = await getMemoryForContext(
      supabase,
      user.id,
      { workspaceId },
    );
    if (memoryResult.count > 0) {
      memoryContext = memoryResult.text;
    }
  } catch {
    // Memory errors are non-fatal
    console.error("[memory] Retrieval failed");
  }

  const systemPrompt =
    "You are Cortex, a concise AI workspace assistant. Help with planning, writing, debugging, and technical reasoning. Use markdown when it improves readability." +
    ragContext +
    memoryContext;

  const result = streamText({
    model: openrouter.chat(selectedModel),
    system: systemPrompt,
    messages: await convertToModelMessages(messages.slice(-30)),
    maxOutputTokens: 1600,
    onFinish: async ({ usage }) => {
      if (!usage) return;
      const supabase = await createSupabaseServerClient();
      await recordUsage(supabase, {
        userId: user.id,
        model: selectedModel,
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
      });
    },
  });

  return result.toUIMessageStreamResponse({
    onError: () => "Cortex could not complete that response.",
  });
}
