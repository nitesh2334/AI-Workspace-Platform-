import { redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/auth";
import { AuthCard } from "@/components/cortex/auth/auth-card";
import { ForgotPasswordForm } from "@/components/cortex/auth/forgot-password-form";

export default async function ForgotPasswordPage() {
  const user = await getUser();
  if (user) redirect("/");

  return (
    <AuthCard
      variant="login"
      title="Reset your password"
      description="Enter your email and we'll send you a reset link."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
