"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AuthCardProps = {
  variant: "login" | "signup";
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AuthCard({ variant, title, description, children }: AuthCardProps) {
  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.18),_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.22),_transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,_rgba(255,255,255,0.06),_transparent_30%),radial-gradient(circle_at_80%_20%,_rgba(139,92,246,0.10),_transparent_35%)] dark:bg-[radial-gradient(circle_at_20%_10%,_rgba(255,255,255,0.07),_transparent_30%),radial-gradient(circle_at_80%_20%,_rgba(139,92,246,0.14),_transparent_35%)]" />

      <div className="relative mx-auto flex min-h-dvh max-w-lg items-center px-4 py-10 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] as const }}
          className="w-full"
        >
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 py-1.5 text-[12px] font-semibold tracking-tight text-foreground/90 shadow-sm backdrop-blur-md transition-colors hover:bg-card"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-highlight/15 ring-1 ring-highlight/25">
                <span className="font-mono text-[11px] font-semibold tracking-tight text-highlight">
                  Cx
                </span>
              </span>
              Cortex
            </Link>

            <div className="text-[13px] text-muted-foreground">
              {variant === "login" ? (
                <>
                  New here?{" "}
                  <Link className="font-medium text-foreground hover:underline" href="/signup">
                    Create account
                  </Link>
                </>
              ) : (
                <>
                  Have an account?{" "}
                  <Link className="font-medium text-foreground hover:underline" href="/login">
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>

          <Card className={cn("overflow-hidden", "shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_40px_120px_rgba(0,0,0,0.22)]")}>
            <CardHeader>
              <CardTitle className="text-balance text-xl">{title}</CardTitle>
              <CardDescription className="text-pretty">
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent>{children}</CardContent>
          </Card>

          <p className="mt-6 text-center text-[12px] text-muted-foreground">
            By continuing you agree to Cortex terms. This is a UI-only demo foundation.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

