import { getUser } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/cortex/rate-limit";
import {
  listMemories,
  getMemory,
  upsertMemory,
  deleteMemory,
  deleteMemoriesByCategory,
  MEMORY_CATEGORIES,
} from "@/lib/cortex/memory";
import type { MemoryCategory } from "@/lib/cortex/memory";
import {
  parseRequestBody,
  createMemorySchema,
  updateMemorySchema,
  deleteMemorySchema,
} from "@/lib/cortex/validation";

export async function GET(req: Request) {
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

  const url = new URL(req.url);
  const categoryParam = url.searchParams.get("category");
  const category = categoryParam && MEMORY_CATEGORIES.includes(categoryParam as MemoryCategory)
    ? (categoryParam as MemoryCategory)
    : undefined;

  const supabase = await createSupabaseServerClient();
  const memories = await listMemories(supabase, user.id, { category });

  return Response.json({ memories });
}

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

  const parsed = await parseRequestBody(req, createMemorySchema, 4096);
  if ("errorResponse" in parsed) return parsed.errorResponse;
  const { key, value, category, importance, source } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const result = await upsertMemory(supabase, user.id, {
    key,
    value,
    category,
    importance,
    source,
  });

  if (result.error) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ memory: result.memory }, { status: 201 });
}

export async function PATCH(req: Request) {
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

  const parsed = await parseRequestBody(req, updateMemorySchema, 4096);
  if ("errorResponse" in parsed) return parsed.errorResponse;
  const { key, value, category, importance } = parsed.data;

  const supabase = await createSupabaseServerClient();

  // Get existing memory to merge with new values
  const existing = await getMemory(supabase, user.id, key);
  if (!existing) {
    return Response.json({ error: "Memory not found" }, { status: 404 });
  }

  const result = await upsertMemory(supabase, user.id, {
    key,
    value: value ?? existing.value,
    category: category ?? existing.category,
    importance: importance ?? existing.importance,
    source: "manual",
  });

  if (result.error) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ memory: result.memory });
}

export async function DELETE(req: Request) {
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

  const url = new URL(req.url);
  const categoryParam = url.searchParams.get("category");

  // If category param is provided, delete all memories in that category
  if (categoryParam) {
    if (!MEMORY_CATEGORIES.includes(categoryParam as MemoryCategory)) {
      return Response.json(
        { error: `Invalid category: ${categoryParam}` },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const result = await deleteMemoriesByCategory(
      supabase,
      user.id,
      categoryParam as MemoryCategory,
    );

    if (result.error) {
      return Response.json({ error: result.error }, { status: 500 });
    }

    return Response.json({ ok: true });
  }

  // Otherwise parse body for key-based deletion
  const parsed = await parseRequestBody(req, deleteMemorySchema, 2048);
  if ("errorResponse" in parsed) return parsed.errorResponse;

  const supabase = await createSupabaseServerClient();
  const result = await deleteMemory(supabase, user.id, parsed.data.key);

  if (result.error) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  return Response.json({ ok: true });
}
