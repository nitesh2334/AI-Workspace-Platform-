import { z } from "zod";

/** POST /api/chat */
export const chatSchema = z.object({
  messages: z.array(z.any()).min(1, "messages must be a non-empty array"),
  conversationId: z.string().optional(),
  model: z.string().optional(),
});

/** POST /api/conversations */
export const createConversationSchema = z.object({
  title: z.string().optional(),
  model: z.string().optional(),
});

/** PATCH /api/conversations/[id] */
export const updateConversationSchema = z.object({
  title: z.string().optional(),
  model: z.string().optional(),
});

/** PUT /api/conversations/[id]/messages */
export const saveMessagesSchema = z.object({
  messages: z.array(z.any()).min(1, "messages must be a non-empty array"),
});

// ─── Memory ───────────────────────────────────────────────────

const memoryCategoryEnum = z.enum([
  "preference",
  "goal",
  "project",
  "background",
  "fact",
  "general",
]);

/** POST /api/memory */
export const createMemorySchema = z.object({
  key: z
    .string()
    .min(1, "Key is required")
    .max(128, "Key is too long")
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "Use only letters, numbers, dots, underscores, and hyphens",
    ),
  value: z.string().min(1, "Value is required").max(2000, "Value is too long"),
  category: memoryCategoryEnum.default("general"),
  importance: z.number().int().min(1).max(5).default(1),
  source: z.enum(["manual", "chat_extraction", "api", "import"]).default("manual"),
});

/** PATCH /api/memory */
export const updateMemorySchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string().min(1, "Value is required").max(2000, "Value is too long").optional(),
  category: memoryCategoryEnum.optional(),
  importance: z.number().int().min(1).max(5).optional(),
});

/** DELETE /api/memory */
export const deleteMemorySchema = z.object({
  key: z.string().min(1, "Key is required"),
});

/** DELETE /api/memory?category=... */
export const deleteCategorySchema = z.object({
  category: memoryCategoryEnum,
});

const DEFAULT_MAX_BODY_SIZE = 1_048_576; // 1 MB

/**
 * Safely parse a request body against a Zod schema.
 * Returns typed data on success, or a 400 Response on failure.
 */
export async function parseRequestBody<T>(
  req: Request,
  schema: z.ZodType<T>,
  maxSize = DEFAULT_MAX_BODY_SIZE,
): Promise<{ data: T } | { errorResponse: Response }> {
  let text: string;
  try {
    text = await req.text();
  } catch {
    return {
      errorResponse: Response.json(
        { error: "Could not read request body" },
        { status: 400 },
      ),
    };
  }

  if (text.length > maxSize) {
    const maxKb = Math.round(maxSize / 1024);
    return {
      errorResponse: Response.json(
        { error: `Request body too large (max ${maxKb} KB)` },
        { status: 413 },
      ),
    };
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return {
      errorResponse: Response.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      ),
    };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    return {
      errorResponse: Response.json(
        { error: `Validation error: ${message}` },
        { status: 400 },
      ),
    };
  }
  return { data: result.data };
}
