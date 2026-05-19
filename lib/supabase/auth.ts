import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

/**
 * Server-side guard for Server Components and Route Handlers.
 * Use it in layouts/pages to prepare protected routes.
 */
export async function requireUser(options?: { redirectTo?: string }) {
  const user = await getUser();
  if (!user) {
    redirect(options?.redirectTo ?? "/login");
  }
  return user;
}

