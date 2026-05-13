import type { UIMessage } from "ai";

export const CORTEX_MODELS = [
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o Mini",
    vendor: "OpenAI",
    hint: "Fast general work",
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet",
    vendor: "Anthropic",
    hint: "Careful reasoning",
  },
  {
    id: "google/gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    vendor: "Google",
    hint: "Low-latency drafting",
  },
] as const;

export const DEFAULT_CORTEX_MODEL = CORTEX_MODELS[0].id;

export type CortexModelId = (typeof CORTEX_MODELS)[number]["id"];

export type CortexConversation = {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
};

export function isSupportedModel(model: string): model is CortexModelId {
  return CORTEX_MODELS.some((item) => item.id === model);
}

export function messageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function titleFromMessages(messages: UIMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const text = firstUserMessage ? messageText(firstUserMessage) : "";
  const compact = text.replace(/\s+/g, " ").trim();

  if (!compact) return "New chat";
  return compact.length > 52 ? `${compact.slice(0, 49)}...` : compact;
}
