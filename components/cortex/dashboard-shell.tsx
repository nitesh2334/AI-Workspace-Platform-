"use client";

import * as React from "react";
import { motion } from "framer-motion";

import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  AppSidebar,
  SIDEBAR_COLLAPSED,
  SIDEBAR_EXPANDED,
} from "@/components/cortex/app-sidebar";
import { TopBar } from "@/components/cortex/top-bar";

type DashboardShellProps = {
  children: React.ReactNode;
  title: string;
  description?: string;
};

export function DashboardShell({
  children,
  title,
  description,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
        <motion.aside
          initial={false}
          animate={{ width: sidebarWidth }}
          transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.7 }}
          className="relative z-40 hidden shrink-0 overflow-hidden border-r border-sidebar-border md:block"
        >
          <AppSidebar
            collapsed={collapsed}
            onToggleCollapsed={() => setCollapsed((c) => !c)}
            className="h-full w-full"
          />
        </motion.aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[min(100%,18rem)] p-0 sm:max-w-[18rem]">
            <AppSidebar
              collapsed={false}
              onToggleCollapsed={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
              className="h-full w-full border-0"
            />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            title={title}
            description={description}
            onOpenMobileNav={() => setMobileOpen(true)}
          />
          <motion.div
            className="flex-1 overflow-y-auto overflow-x-hidden"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </TooltipProvider>
  );
}
