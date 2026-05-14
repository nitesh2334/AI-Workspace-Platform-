"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertIcon, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { OAuthButtons } from "@/components/cortex/auth/oauth-buttons";

type EmailAuthFormProps =
  | { mode: "login"; next?: string }
  | { mode: "signup"; next?: string };

export function EmailAuthForm({ mode, next = "/" }: EmailAuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const canSubmit = email.trim().length > 3 && password.length >= 8 && !loading;

  return (
    <div className="space-y-5">
      <OAuthButtons />

      <div className="relative py-1">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          or
        </span>
      </div>

      {error ? (
        <Alert className="border-destructive/30 bg-destructive/5">
          <div className="flex gap-2">
            <AlertIcon className="mt-0.5 text-destructive" />
            <div className="min-w-0">
              <AlertTitle className="text-destructive">Authentication failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </div>
          </div>
        </Alert>
      ) : null}

      {message ? (
        <Alert>
          <div className="flex gap-2">
            <AlertIcon className="mt-0.5" />
            <div className="min-w-0">
              <AlertTitle>Check your inbox</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </div>
          </div>
        </Alert>
      ) : null}

      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setMessage(null);
          setLoading(true);

          try {
            const supabase = createSupabaseBrowserClient();

            if (mode === "login") {
              const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
              });
              if (signInError) throw signInError;
              router.push(next);
              router.refresh();
              return;
            }

            const { data, error: signUpError } = await supabase.auth.signUp({
              email,
              password,
              options: {
                
                emailRedirectTo: `${window.location.origin}/auth/callback`,
              },
            });
            if (signUpError) throw signUpError;

            if (data.session) {
              router.push(next);
              router.refresh();
              return;
            }

            setMessage("Confirm your email to finish creating your account.");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
          } finally {
            setLoading(false);
          }
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
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

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">Password</Label>
            {mode === "login" ? (
              <span className="text-xs text-muted-foreground">
                <Link className="hover:text-foreground hover:underline" href="/login">
                  Forgot?
                </Link>
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Min 8 characters</span>
            )}
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
            minLength={8}
          />
        </div>

        <Button
          type="submit"
          variant="premium"
          className="h-10 w-full rounded-xl"
          disabled={!canSubmit}
        >
          {loading ? <Loader2Icon className="size-4 animate-spin" aria-hidden /> : null}
          {mode === "login" ? "Sign in" : "Create account"}
        </Button>

        <p className="text-center text-[12px] text-muted-foreground">
          {mode === "login" ? (
            <>
              Need an account?{" "}
              <Link className="font-medium text-foreground hover:underline" href="/signup">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link className="font-medium text-foreground hover:underline" href="/login">
                Sign in
              </Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}

