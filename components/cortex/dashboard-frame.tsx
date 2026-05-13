"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { DashboardShell } from "@/components/cortex/dashboard-shell";

const ROUTES: Record<string, { title: string; description?: string }> = {
  "/": {
    title: "Overview",
    description: "Latency, reliability, and orchestration across your AI stack.",
  },
  "/projects": {
    title: "Projects",
    description: "Experiments, prompts, and deployment surfaces.",
  },
  "/chat": {
    title: "Chat",
    description: "Streaming AI responses powered by OpenRouter.",
  },
  "/stacks": {
    title: "Stacks",
    description: "Models, tools, and environments wired together.",
  },
  "/workflows": {
    title: "Workflows",
    description: "Deterministic paths with observability baked in.",
  },
  "/integrations": {
    title: "Integrations",
    description: "Connect data planes, vendors, and identity.",
  },
  "/settings": {
    title: "Workspace settings",
    description: "Policies, budgets, and collaboration defaults.",
  },
};

export function DashboardFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const meta = ROUTES[pathname] ?? {
    title: "Cortex",
    description: "AI workspace shell.",
  };

  return (
    <DashboardShell title={meta.title} description={meta.description}>
      {children}
    </DashboardShell>
  );
}
