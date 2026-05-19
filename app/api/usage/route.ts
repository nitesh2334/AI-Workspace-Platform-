import { getUser } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUsageAggregation } from "@/lib/cortex/usage";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();

  try {
    const data = await getUsageAggregation(supabase, user.id);
    return Response.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch usage data";
    return Response.json({ error: message }, { status: 500 });
  }
}
