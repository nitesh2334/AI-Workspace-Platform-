"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircleIcon, Loader2Icon } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertIcon, AlertTitle } from "@/components/ui/alert";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const passwordsMatch = password === confirm;
  const passwordValid = password.length >= 8;
  const canSubmit = passwordValid && passwordsMatch && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update password.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-5">
        <Alert>
          <div className="flex gap-2">
            <CheckCircleIcon className="mt-0.5 size-5 text-emerald-500" />
            <div className="min-w-0">
              <AlertTitle>Password updated</AlertTitle>
              <AlertDescription>
                Your password has been changed successfully.
              </AlertDescription>
            </div>
          </div>
        </Alert>

        <Button
          variant="premium"
          className="h-10 w-full rounded-xl"
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
        >
          Continue to Cortex
        </Button>
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
                Update failed
              </AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </div>
          </div>
        </Alert>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
            minLength={8}
          />
          <p className="text-xs text-muted-foreground">
            {password.length > 0 && !passwordValid
              ? "Must be at least 8 characters."
              : password.length >= 8
                ? "Strong enough."
                : "Min 8 characters."}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            name="confirm"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={loading}
            required
            minLength={8}
          />
          {confirm.length > 0 && !passwordsMatch ? (
            <p className="text-xs text-destructive">Passwords do not match.</p>
          ) : null}
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
          Update password
        </Button>
      </form>

      <p className="text-center text-[12px] text-muted-foreground">
        <Link
          className="font-medium text-foreground hover:underline"
          href="/login"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
