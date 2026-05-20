import { redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/auth";
import { ResetPasswordForm } from "@/components/cortex/auth/reset-password-form";

export default async function ResetPasswordPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.18),_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.22),_transparent_55%)]" />
      <div className="mx-auto flex min-h-dvh max-w-sm items-center px-4 py-10 md:px-8">
        <div className="w-full">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-highlight/15 ring-1 ring-highlight/25">
              <span className="font-mono text-sm font-semibold tracking-tight text-highlight">
                Cx
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Set new password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a new password for your account.
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card/70 p-6 text-card-foreground shadow-sm shadow-black/5 backdrop-blur-md">
            <ResetPasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
