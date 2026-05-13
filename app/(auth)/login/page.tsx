import { redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/auth";
import { AuthCard } from "@/components/cortex/auth/auth-card";
import { EmailAuthForm } from "@/components/cortex/auth/email-auth-form";

export default async function LoginPage() {
  const user = await getUser();
  if (user) redirect("/");

  return (
    <AuthCard
      variant="login"
      title="Welcome back"
      description="Sign in to Cortex to access your workspace."
    >
      <EmailAuthForm mode="login" next="/" />
    </AuthCard>
  );
}

