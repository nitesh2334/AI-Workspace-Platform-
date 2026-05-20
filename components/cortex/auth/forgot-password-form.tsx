"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeftIcon, Loader2Icon, MailIcon } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertIcon, AlertTitle } from "@/components/ui/alert";

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const canSubmit = email.trim().length > 3 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const origin =
        process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const supabase = createSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${origin}/auth/callback?next=/reset-password`,
        },
      );
      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send reset email.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-5">
        <Alert>
          <div className="flex gap-2">
            <MailIcon className="mt-0.5 size-5 text-highlight" />
            <div className="min-w-0">
              <AlertTitle>Check your inbox</AlertTitle>
              <AlertDescription>
                If an account with <strong>{email}</strong> exists, you'll
                receive a password reset link shortly.
              </AlertDescription>
            </div>
          </div>
        </Alert>

        <Button
          variant="outline"
          className="h-10 w-full rounded-xl"
          onClick={() => {
            setSent(false);
            setEmail("");
          }}
        >
          Send another link
        </Button>

        <p className="text-center text-[12px] text-muted-foreground">
          <Link
            className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
            href="/login"
          >
            <ArrowLeftIcon className="size-3" />
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error ? (
        <Alert className="border-destructive/30 bg-destructive/5">
          <div className="flex gap-2">
            <AlertIcon className="mt-0.5 text-destructive" />
            <div className="min-w-0">
              <AlertTitle className="text-destructive">
                Failed to send
              </AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </div>
          </div>
        </Alert>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="reset-email">Email</Label>
          <Input
            id="reset-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@company.dev"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <Button
          type="submit"
          variant="premium"
          className="h-10 w-full rounded-xl"
          disabled={!canSubmit}
        >
          {loading ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden />
          ) : null}
          Send reset link
        </Button>
      </form>

      <p className="text-center text-[12px] text-muted-foreground">
        <Link
          className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
          href="/login"
        >
          <ArrowLeftIcon className="size-3" />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
