"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellIcon, MenuIcon, SearchIcon } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/cortex/theme-toggle";

type TopBarProps = {
  title: string;
  description?: string;
  onOpenMobileNav: () => void;
};

export function TopBar({ title, description, onOpenMobileNav }: TopBarProps) {
  const router = useRouter();
  const [email, setEmail] = React.useState<string | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    const supabase = createSupabaseBrowserClient();

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!mounted) return;
        setEmail(data.user?.email ?? null);
      })
      .finally(() => {
        if (!mounted) return;
        setAuthLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border/80 bg-background/80 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 md:px-6">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 shrink-0 rounded-lg md:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
      >
        <MenuIcon className="size-[18px]" />
      </Button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[15px] font-semibold tracking-tight text-foreground md:text-base">
          {title}
        </h1>
        {description ? (
          <p className="truncate text-[13px] text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      <div className="hidden max-w-md flex-1 md:flex md:justify-center">
        <button
          type="button"
          className="flex h-9 w-full max-w-sm items-center gap-2 rounded-full border border-border/80 bg-muted/40 px-3 text-left text-[13px] text-muted-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-colors hover:border-border hover:bg-muted/60 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
        >
          <SearchIcon className="size-[15px] shrink-0 opacity-70" />
          <span className="truncate">Search workspace…</span>
          <kbd className="ml-auto hidden rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground lg:inline-block">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />

        {email ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative size-9 rounded-lg text-muted-foreground hover:text-foreground"
              aria-label="Notifications"
            >
              <BellIcon className="size-[18px]" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-highlight ring-2 ring-background" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 rounded-full p-0 ring-1 ring-border/80 hover:ring-border"
                  aria-label="Account menu"
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-highlight/90 to-highlight/50 text-[11px] font-semibold text-highlight-foreground shadow-inner">
                    {(email[0] ?? "M").toUpperCase()}
                    {(email.split("@")[0]?.[1] ?? "E").toUpperCase()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">Signed in</span>
                    <span className="text-xs text-muted-foreground">{email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-default">Preferences</DropdownMenuItem>
                <DropdownMenuItem className="cursor-default">
                  Keyboard shortcuts
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-muted-foreground"
                  onSelect={async () => {
                    const supabase = createSupabaseBrowserClient();
                    await supabase.auth.signOut();
                    router.push("/login");
                    router.refresh();
                  }}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <Button
            asChild
            variant="outline"
            className="h-9 rounded-full px-4 text-[13px]"
            disabled={authLoading}
          >
            <Link href="/login">Sign in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
