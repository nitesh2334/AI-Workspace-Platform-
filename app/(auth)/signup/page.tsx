import { redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/auth";
import { AuthCard } from "@/components/cortex/auth/auth-card";
import { EmailAuthForm } from "@/components/cortex/auth/email-auth-form";

export default async function SignupPage() {
  const user = await getUser();
  if (user) redirect("/");

  return (
    <AuthCard
      variant="signup"
      title="Create your account"
      description="Crisp surfaces, calm workflow, and instant dark mode."
    >
      <EmailAuthForm mode="signup" next="/" />
    </AuthCard>
  );
}

