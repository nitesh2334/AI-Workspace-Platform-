import type { ReactNode } from "react";

import { DashboardFrame } from "@/components/cortex/dashboard-frame";
import { WorkspaceProvider } from "@/lib/cortex/workspace-context";
import { requireUser } from "@/lib/supabase/auth";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireUser({ redirectTo: "/login" });
  return (
    <WorkspaceProvider>
      <DashboardFrame>{children}</DashboardFrame>
    </WorkspaceProvider>
  );
}

