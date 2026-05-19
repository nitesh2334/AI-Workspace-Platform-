import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Approximate OpenRouter per-1M-token pricing (USD).
 * Used for cost estimation — not a billing-grade calculation.
 */
const MODEL_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "openai/gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.60 },
  "anthropic/claude-3.5-sonnet": { inputPer1M: 3.00, outputPer1M: 15.00 },
  "google/gemini-2.0-flash": { inputPer1M: 0.10, outputPer1M: 0.40 },
};

const DEFAULT_PRICING = { inputPer1M: 1.00, outputPer1M: 2.00 };

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = MODEL_PRICING[model] ?? DEFAULT_PRICING;
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  return Math.round((inputCost + outputCost) * 1e8) / 1e8;
}

export async function recordUsage(
  supabase: SupabaseClient,
  params: {
    userId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
  },
): Promise<void> {
  const { userId, model, inputTokens, outputTokens } = params;
  const estimatedCost = estimateCost(model, inputTokens, outputTokens);

  const { error } = await supabase.from("cortex_usage").insert({
    user_id: userId,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost: estimatedCost,
  });

  if (error) {
    // Log but don't throw — usage tracking should never break a chat.
    console.error("[usage] Failed to record usage:", error.message);
  }
}

export interface UsageRow {
  model: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
  created_at: string;
}

export interface UsageAggregation {
  summary: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
    totalRequests: number;
  };
  byModel: Array<{
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    requests: number;
  }>;
  daily: Array<{
    date: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    requests: number;
  }>;
  weekly: Array<{
    week: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    requests: number;
  }>;
}

function getWeekKey(date: Date): string {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const year = start.getUTCFullYear();
  const dayOfYear = Math.floor(
    (start.getTime() - new Date(Date.UTC(year, 0, 1)).getTime()) /
      (24 * 60 * 60 * 1000),
  );
  const week = Math.ceil((dayOfYear + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export async function getUsageAggregation(
  supabase: SupabaseClient,
  userId: string,
): Promise<UsageAggregation> {
  const twelveWeeksAgo = new Date(
    Date.now() - 12 * 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("cortex_usage")
    .select("model, input_tokens, output_tokens, estimated_cost, created_at")
    .eq("user_id", userId)
    .gte("created_at", twelveWeeksAgo)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = data as UsageRow[];

  // --- Totals ---
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;

  // --- By model ---
  const modelMap = new Map<
    string,
    { inputTokens: number; outputTokens: number; cost: number; requests: number }
  >();

  // --- Daily (last 30 days) ---
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dayMap = new Map<
    string,
    { inputTokens: number; outputTokens: number; cost: number; requests: number }
  >();

  // --- Weekly (last 12 weeks) ---
  const weekMap = new Map<
    string,
    { inputTokens: number; outputTokens: number; cost: number; requests: number }
  >();

  for (const row of rows) {
    totalInputTokens += row.input_tokens;
    totalOutputTokens += row.output_tokens;
    totalCost += row.estimated_cost;

    // By model
    const m = modelMap.get(row.model) ?? {
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      requests: 0,
    };
    m.inputTokens += row.input_tokens;
    m.outputTokens += row.output_tokens;
    m.cost += row.estimated_cost;
    m.requests += 1;
    modelMap.set(row.model, m);

    // Daily
    if (row.created_at >= thirtyDaysAgo) {
      const dateKey = row.created_at.slice(0, 10);
      const d = dayMap.get(dateKey) ?? {
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        requests: 0,
      };
      d.inputTokens += row.input_tokens;
      d.outputTokens += row.output_tokens;
      d.cost += row.estimated_cost;
      d.requests += 1;
      dayMap.set(dateKey, d);
    }

    // Weekly
    const weekKey = getWeekKey(new Date(row.created_at));
    const w = weekMap.get(weekKey) ?? {
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      requests: 0,
    };
    w.inputTokens += row.input_tokens;
    w.outputTokens += row.output_tokens;
    w.cost += row.estimated_cost;
    w.requests += 1;
    weekMap.set(weekKey, w);
  }

  const byModel = [...modelMap.entries()]
    .map(([model, stats]) => ({ model, ...stats }))
    .sort((a, b) => b.cost - a.cost);

  const daily = [...dayMap.entries()]
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const weekly = [...weekMap.entries()]
    .map(([week, stats]) => ({ week, ...stats }))
    .sort((a, b) => a.week.localeCompare(b.week));

  return {
    summary: {
      totalInputTokens,
      totalOutputTokens,
      totalCost: Math.round(totalCost * 1e8) / 1e8,
      totalRequests: rows.length,
    },
    byModel,
    daily,
    weekly,
  };
}
