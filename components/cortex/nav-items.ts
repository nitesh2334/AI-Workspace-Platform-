import type { LucideIcon } from "lucide-react";
import {
  BotMessageSquare,
  Gauge,
  KanbanSquare,
  Layers,
  Plug,
  Settings,
  Workflow,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export const mainNav: NavItem[] = [
  { title: "Overview", href: "/", icon: Gauge },
  { title: "Chat", href: "/chat", icon: BotMessageSquare },
  { title: "Projects", href: "/projects", icon: KanbanSquare },
  { title: "Stacks", href: "/stacks", icon: Layers },
  { title: "Workflows", href: "/workflows", icon: Workflow, badge: "New" },
];

export const bottomNav: NavItem[] = [
  { title: "Integrations", href: "/integrations", icon: Plug },
  { title: "Workspace settings", href: "/settings", icon: Settings },
];
