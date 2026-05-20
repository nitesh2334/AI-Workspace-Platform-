"use client";

import * as React from "react";

// ─── Types ───────────────────────────────────────────────────

export type Workspace = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type WorkspaceContextValue = {
  /** All workspaces the user has access to. */
  workspaces: Workspace[];
  /** The currently active workspace. */
  activeWorkspace: Workspace | null;
  /** True while workspaces are being fetched. */
  loading: boolean;
  /** Switch to a different workspace. */
  setActiveWorkspace: (workspace: Workspace) => void;
  /** Refetch the workspaces list. */
  refresh: () => Promise<void>;
};

// ─── Context ─────────────────────────────────────────────────

const WorkspaceContext = React.createContext<WorkspaceContextValue | null>(
  null,
);

const STORAGE_KEY = "cortex:activeWorkspaceId";

// ─── Helpers ─────────────────────────────────────────────────

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

// ─── Provider ────────────────────────────────────────────────

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] =
    React.useState<Workspace | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [initialised, setInitialised] = React.useState(false);

  async function loadWorkspaces() {
    setLoading(true);
    try {
      let result = await api<{ workspaces: Workspace[] }>(
        "/api/workspaces",
      );
      let list = result.workspaces;

      // Auto-create a default workspace for new users with no workspaces
      if (list.length === 0) {
        try {
          const createResult = await api<{ workspace: Workspace }>(
            "/api/workspaces",
            {
              method: "POST",
              body: JSON.stringify({ name: "Default" }),
            },
          );
          list = [createResult.workspace];
          setWorkspaces(list);
        } catch {
          console.error("[workspace] Failed to create default workspace");
        }
      }

      if (list.length > 0) {
        // Try to restore the previously active workspace from localStorage
        const storedId = localStorage.getItem(STORAGE_KEY);
        const stored = storedId
          ? list.find((w) => w.id === storedId)
          : null;
        const active = stored ?? list[0];
        setActiveWorkspaceState(active);
        if (stored?.id !== active.id) {
          localStorage.setItem(STORAGE_KEY, active.id);
        }
      }
    } catch {
      // Workspace load failure is non-fatal
      console.error("[workspace] Failed to load workspaces");
    } finally {
      setLoading(false);
      setInitialised(true);
    }
  }

  React.useEffect(() => {
    void loadWorkspaces();
  }, []);

  function setActiveWorkspace(workspace: Workspace) {
    setActiveWorkspaceState(workspace);
    localStorage.setItem(STORAGE_KEY, workspace.id);
  }

  // Prevent rendering children until workspaces are loaded,
  // so components never see a null activeWorkspace.
  // If there are no workspaces yet, still render (the user just signed up).
  if (!initialised) {
    return null;
  }

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        loading,
        setActiveWorkspace,
        refresh: loadWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────

export function useWorkspace(): WorkspaceContextValue {
  const ctx = React.useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a <WorkspaceProvider>");
  }
  return ctx;
}
