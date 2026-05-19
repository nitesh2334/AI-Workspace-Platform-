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

/**
 * Safely parse a request body against a Zod schema.
 * Returns typed data on success, or a 400 Response on failure.
 */
export async function parseRequestBody<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T } | { errorResponse: Response }> {
  let body: unknown;
  try {
    body = await req.json();
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
