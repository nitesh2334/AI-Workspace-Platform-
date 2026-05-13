"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  bottomNav,
  mainNav,
  type NavItem,
} from "@/components/cortex/nav-items";

const SIDEBAR_EXPANDED = 248;
const SIDEBAR_COLLAPSED = 72;

type AppSidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Close mobile sheet after navigation */
  onNavigate?: () => void;
  className?: string;
};

export function AppSidebar({
  collapsed,
  onToggleCollapsed,
  onNavigate,
  className,
}: AppSidebarProps) {
  const pathname = usePathname();

  const NavLink = ({
    href,
    title,
    icon: Icon,
    badge,
  }: NavItem) => {
    const active =
      href === "/"
        ? pathname === "/"
        : pathname === href || pathname.startsWith(`${href}/`);

    const linkInner = (
      <Link
        href={href}
        onClick={() => onNavigate?.()}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium tracking-tight transition-colors",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
          collapsed && "justify-center px-0",
        )}
      >
        <Icon
          className={cn(
            "size-[18px] shrink-0 transition-colors",
            active ? "text-highlight" : "text-muted-foreground group-hover:text-foreground",
          )}
          aria-hidden
        />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate">{title}</span>
            {badge ? (
              <span className="rounded-full bg-highlight/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-highlight">
                {badge}
              </span>
            ) : null}
          </>
        )}
        {active && !collapsed && (
          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-highlight" />
        )}
        {active && collapsed && (
          <span className="absolute left-1 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-highlight" />
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkInner}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {title}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkInner;
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col border-sidebar-border bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-sidebar-border px-3",
          collapsed ? "justify-center" : "gap-2",
        )}
      >
        <div className="flex size-9 items-center justify-center rounded-lg bg-highlight/15 ring-1 ring-highlight/25">
          <span className="font-mono text-sm font-semibold tracking-tight text-highlight">
            Cx
          </span>
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold tracking-tight">
              Cortex
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              AI workspace
            </p>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-2 py-4">
        <div className="space-y-6">
          <div>
            <p
              className={cn(
                "mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
                collapsed && "sr-only",
              )}
            >
              Workspace
            </p>
            <nav className="flex flex-col gap-0.5">
              {mainNav.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </nav>
          </div>

          <Separator className="bg-sidebar-border" />

          <div>
            <p
              className={cn(
                "mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
                collapsed && "sr-only",
              )}
            >
              Configure
            </p>
            <nav className="flex flex-col gap-0.5">
              {bottomNav.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </nav>
          </div>
        </div>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-2">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "w-full justify-start gap-2 text-muted-foreground hover:text-foreground",
                collapsed && "justify-center px-0",
              )}
              onClick={onToggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRightIcon className="size-4" />
              ) : (
                <>
                  <ChevronLeftIcon className="size-4" />
                  <span className="text-[13px]">Collapse</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {collapsed ? "Expand sidebar" : "Collapse sidebar"}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export { SIDEBAR_COLLAPSED, SIDEBAR_EXPANDED };
