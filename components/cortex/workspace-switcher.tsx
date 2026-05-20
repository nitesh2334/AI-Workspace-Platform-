"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/cortex/workspace-context";

export function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();

  if (!activeWorkspace) return null;

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-lg bg-highlight/15 ring-1 ring-highlight/25 hover:bg-highlight/20"
            aria-label="Switch workspace"
          >
            <span className="font-mono text-sm font-semibold tracking-tight text-highlight">
              {activeWorkspace.name.charAt(0).toUpperCase()}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right" className="w-48 p-1.5">
          <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Workspaces
          </DropdownMenuLabel>
          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => setActiveWorkspace(ws)}
              className="gap-2 p-2"
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full",
                  ws.id === activeWorkspace.id
                    ? "text-highlight"
                    : "text-transparent",
                )}
              >
                {ws.id === activeWorkspace.id ? (
                  <Check className="size-3.5" />
                ) : null}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                {ws.name}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="flex h-9 w-full items-center justify-between gap-2 rounded-lg px-2 text-left hover:bg-sidebar-accent/60"
        >
          <div className="flex size-7 items-center justify-center rounded-lg bg-highlight/15 ring-1 ring-highlight/25">
            <span className="font-mono text-xs font-semibold tracking-tight text-highlight">
              {activeWorkspace.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold tracking-tight">
              {activeWorkspace.name}
            </p>
          </div>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Workspaces
        </DropdownMenuLabel>
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => setActiveWorkspace(ws)}
            className="gap-2 p-2"
          >
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full",
                ws.id === activeWorkspace.id
                  ? "text-highlight"
                  : "text-transparent",
              )}
            >
              {ws.id === activeWorkspace.id ? (
                <Check className="size-3.5" />
              ) : null}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">{ws.name}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 p-2 text-muted-foreground">
          <Plus className="size-4" />
          <span className="text-sm">New workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
