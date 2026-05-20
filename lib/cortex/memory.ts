import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Types ───────────────────────────────────────────────────

export type MemoryCategory = "preference" | "goal" | "project" | "background" | "fact" | "general";
export const MEMORY_CATEGORIES: MemoryCategory[] = [
  "preference",
  "goal",
  "project",
  "background",
  "fact",
  "general",
];

export type MemorySource = "manual" | "chat_extraction" | "api" | "import";

export type MemoryEntry = {
  id: string;
  key: string;
  value: string;
  category: MemoryCategory;
  importance: number;
  source: MemorySource;
  createdAt: string;
  updatedAt: string;
};

type MemoryRow = {
  id: string;
  key: string;
  value: string;
  category: string;
  importance: number;
  source: string;
  created_at: string;
  updated_at: string;
};

function rowToEntry(row: MemoryRow): MemoryEntry {
  return {
    id: row.id,
    key: row.key,
    value: row.value,
    category: row.category as MemoryCategory,
    importance: row.importance,
    source: row.source as MemorySource,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── CRUD ────────────────────────────────────────────────────

export async function listMemories(
  supabase: SupabaseClient,
  userId: string,
  options?: {
    category?: MemoryCategory;
    limit?: number;
    workspaceId?: string;
  },
): Promise<MemoryEntry[]> {
  let query = supabase
    .from("cortex_memory")
    .select("*")
    .eq("user_id", userId)
    .order("importance", { ascending: false })
    .order("updated_at", { ascending: false });

  if (options?.workspaceId) {
    query = query.eq("workspace_id", options.workspaceId);
  }

  if (options?.category) {
    query = query.eq("category", options.category);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[memory] listMemories failed:", error.message);
    return [];
  }

  return (data ?? []).map(rowToEntry);
}

export async function getMemory(
  supabase: SupabaseClient,
  userId: string,
  key: string,
  options?: { workspaceId?: string },
): Promise<MemoryEntry | null> {
  let query = supabase
    .from("cortex_memory")
    .select("*")
    .eq("user_id", userId)
    .eq("key", key);

  if (options?.workspaceId) {
    query = query.eq("workspace_id", options.workspaceId);
  }

  const { data, error } = await query.single();

  if (error) return null;
  return rowToEntry(data);
}

export async function upsertMemory(
  supabase: SupabaseClient,
  userId: string,
  params: {
    key: string;
    value: string;
    category: MemoryCategory;
    importance?: number;
    source?: MemorySource;
    workspaceId?: string;
  },
): Promise<{ memory: MemoryEntry | null; error?: string }> {
  const { key, value, category, importance = 1, source = "manual", workspaceId } = params;

  // Validate key format (alphanumeric + dots + underscores + hyphens)
  if (!/^[a-zA-Z0-9._-]+$/.test(key)) {
    return {
      memory: null,
      error:
        "Invalid key. Use only letters, numbers, dots, underscores, and hyphens.",
    };
  }

  if (value.length > 2000) {
    return { memory: null, error: "Value is too long (max 2000 characters)." };
  }

  const { data, error } = await supabase
    .from("cortex_memory")
    .upsert(
      {
        user_id: userId,
        workspace_id: workspaceId,
        key,
        value,
        category,
        importance,
        source,
      },
      {
        onConflict: "workspace_id, key",
        ignoreDuplicates: false,
      },
    )
    .select("*")
    .single();

  if (error) {
    return { memory: null, error: error.message };
  }

  return { memory: rowToEntry(data) };
}

export async function deleteMemory(
  supabase: SupabaseClient,
  userId: string,
  key: string,
  options?: { workspaceId?: string },
): Promise<{ ok: boolean; error?: string }> {
  let query = supabase
    .from("cortex_memory")
    .delete()
    .eq("user_id", userId)
    .eq("key", key);

  if (options?.workspaceId) {
    query = query.eq("workspace_id", options.workspaceId);
  }

  const { error } = await query;

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function deleteMemoriesByCategory(
  supabase: SupabaseClient,
  userId: string,
  category: MemoryCategory,
  options?: { workspaceId?: string },
): Promise<{ ok: boolean; error?: string }> {
  let query = supabase
    .from("cortex_memory")
    .delete()
    .eq("user_id", userId)
    .eq("category", category);

  if (options?.workspaceId) {
    query = query.eq("workspace_id", options.workspaceId);
  }

  const { error } = await query;

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

// ─── Retrieval for Chat Injection ────────────────────────────

export interface MemoryContextResult {
  /** Structured memories formatted as a readable string for the system prompt. */
  text: string;
  /** Total number of memories found. */
  count: number;
}

/**
 * Retrieve relevant memories for injection into the chat system prompt.
 *
 * Returns all memories with importance ≥ 2, grouped by category,
 * formatted as a readable string for the system prompt.
 */
export async function getMemoryForContext(
  supabase: SupabaseClient,
  userId: string,
  options?: { workspaceId?: string },
): Promise<MemoryContextResult> {
  let query = supabase
    .from("cortex_memory")
    .select("*")
    .eq("user_id", userId)
    .gte("importance", 2)
    .order("importance", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(15);

  if (options?.workspaceId) {
    query = query.eq("workspace_id", options.workspaceId);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return { text: "", count: 0 };
  }

  const entries = data.map(rowToEntry);

  // Build readable sections grouped by category
  const sections: string[] = [];

  const background = entries.filter((e) => e.category === "background");
  const goals = entries.filter((e) => e.category === "goal");
  const projects = entries.filter((e) => e.category === "project");
  const preferences = entries.filter((e) => e.category === "preference");
  const facts = entries.filter((e) => e.category === "fact");
  const general = entries.filter((e) => e.category === "general");

  if (background.length > 0) {
    sections.push(
      "About the user:\n" +
        background.map((e) => `  - ${e.key}: ${e.value}`).join("\n"),
    );
  }

  if (goals.length > 0) {
    sections.push(
      "Goals:\n" + goals.map((e) => `  - ${e.value}`).join("\n"),
    );
  }

  if (projects.length > 0) {
    sections.push(
      "Projects:\n" + projects.map((e) => `  - ${e.key}: ${e.value}`).join("\n"),
    );
  }

  if (preferences.length > 0) {
    sections.push(
      "Preferences:\n" +
        preferences.map((e) => `  - ${e.key}: ${e.value}`).join("\n"),
    );
  }

  if (facts.length > 0) {
    sections.push(
      "Facts:\n" + facts.map((e) => `  - ${e.value}`).join("\n"),
    );
  }

  if (general.length > 0) {
    sections.push(
      "Other context:\n" +
        general.map((e) => `  - ${e.key}: ${e.value}`).join("\n"),
    );
  }

  if (sections.length === 0) {
    return { text: "", count: 0 };
  }

  return {
    text:
      "\n\n--- User Memory ---\n" +
      "The user has shared the following information about themselves. Use it to personalize responses.\n\n" +
      sections.join("\n\n"),
    count: entries.length,
  };
}
