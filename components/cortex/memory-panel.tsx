"use client";

import * as React from "react";
import {
  Brain,
  Edit3,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  MEMORY_CATEGORIES,
  type MemoryCategory,
  type MemoryEntry,
} from "@/lib/cortex/memory";
import { useWorkspace } from "@/lib/cortex/workspace-context";

// ─── Types ───────────────────────────────────────────────────

type MemoryFormData = {
  key: string;
  value: string;
  category: MemoryCategory;
  importance: number;
};

// ─── API helpers ─────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  preference: "Preferences",
  goal: "Goals",
  project: "Projects",
  background: "Background",
  fact: "Facts",
  general: "General",
};

const CATEGORY_DESCRIPTIONS: Record<MemoryCategory, string> = {
  preference: "UI/behavioral preferences like default model or tone",
  goal: "Your stated goals and objectives",
  project: "Project context: tech stack, domain, constraints",
  background: "Your role, expertise level, skills",
  fact: "Personal facts extracted from conversation",
  general: "Uncategorized information",
};

const IMPORTANCE_LABELS: Record<number, string> = {
  1: "Convenience",
  2: "Helpful",
  3: "Important",
  4: "Very important",
  5: "Critical",
};

function MemoryCard({
  memory,
  onEdit,
  onDelete,
}: {
  memory: MemoryEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="group relative transition-shadow hover:shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-3 pb-1.5">
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {memory.key}
          </CardTitle>
          <span
            className={cn(
              "mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              memory.importance >= 4
                ? "bg-highlight/10 text-highlight"
                : memory.importance >= 2
                  ? "bg-muted text-muted-foreground"
                  : "bg-transparent text-muted-foreground/60",
            )}
          >
            {IMPORTANCE_LABELS[memory.importance] ?? `Level ${memory.importance}`}
          </span>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onEdit}
            aria-label={`Edit ${memory.key}`}
          >
            <Edit3 className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:text-destructive"
            onClick={onDelete}
            aria-label={`Delete ${memory.key}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        <p className="text-sm leading-relaxed text-card-foreground">
          {memory.value}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {CATEGORY_LABELS[memory.category] ?? memory.category}
          {" · "}
          {new Date(memory.updatedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </p>
      </CardContent>
    </Card>
  );
}

function MemoryForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: MemoryEntry;
  onSubmit: (data: MemoryFormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [key, setKey] = React.useState(initial?.key ?? "");
  const [value, setValue] = React.useState(initial?.value ?? "");
  const [category, setCategory] = React.useState<MemoryCategory>(
    initial?.category ?? "general",
  );
  const [importance, setImportance] = React.useState(initial?.importance ?? 1);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ key, value, category, importance });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="memory-key">Key</Label>
        <Input
          id="memory-key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="e.g. background.role, project.alpha.tech_stack"
          disabled={!!initial}
          required
          className="font-mono text-xs"
        />
        <p className="text-[11px] text-muted-foreground">
          Use dots to namespace:{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            category.key
          </code>
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="memory-value">Value</Label>
        <textarea
          id="memory-value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Describe what Cortex should remember..."
          rows={3}
          required
          maxLength={2000}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring"
        />
        <p className="text-right text-[11px] text-muted-foreground">
          {value.length}/2000
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="memory-category">Category</Label>
          <select
            id="memory-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as MemoryCategory)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring"
          >
            {MEMORY_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="memory-importance">Importance</Label>
          <select
            id="memory-importance"
            value={importance}
            onChange={(e) => setImportance(Number(e.target.value))}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring"
          >
            {[1, 2, 3, 4, 5].map((level) => (
              <option key={level} value={level}>
                {IMPORTANCE_LABELS[level]} ({level})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving || !key || !value}>
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : initial ? (
            "Update"
          ) : (
            "Create"
          )}
        </Button>
      </div>
    </form>
  );
}

// ─── Main Panel ──────────────────────────────────────────────

export function MemoryPanel() {
  const { activeWorkspace } = useWorkspace();
  const [memories, setMemories] = React.useState<MemoryEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeCategory, setActiveCategory] = React.useState<MemoryCategory | "all">("all");
  const [showForm, setShowForm] = React.useState(false);
  const [editingMemory, setEditingMemory] = React.useState<MemoryEntry | null>(null);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const filteredMemories =
    activeCategory === "all"
      ? memories
      : memories.filter((m) => m.category === activeCategory);

  async function loadMemories() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeCategory !== "all") params.set("category", activeCategory);
      if (activeWorkspace?.id) params.set("workspace_id", activeWorkspace.id);
      const qs = params.toString();
      const result = await api<{ memories: MemoryEntry[] }>(
        `/api/memory${qs ? `?${qs}` : ""}`,
      );
      setMemories(result.memories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load memories");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadMemories();
  }, [activeCategory, activeWorkspace?.id]);

  async function handleCreate(data: MemoryFormData) {
    await api("/api/memory", {
      method: "POST",
      body: JSON.stringify({
        ...data,
        workspace_id: activeWorkspace?.id,
      }),
    });
    setShowForm(false);
    void loadMemories();
  }

  async function handleUpdate(data: MemoryFormData) {
    if (!editingMemory) return;
    await api("/api/memory", {
      method: "PATCH",
      body: JSON.stringify({
        ...data,
        workspace_id: activeWorkspace?.id,
      }),
    });
    setEditingMemory(null);
    void loadMemories();
  }

  async function handleDelete(key: string) {
    if (deleting === key) return;
    setDeleting(key);
    try {
      const params = activeWorkspace?.id
        ? `?workspace_id=${activeWorkspace.id}`
        : "";
      await api(`/api/memory${params}`, {
        method: "DELETE",
        body: JSON.stringify({ key }),
      });
      setMemories((prev) => prev.filter((m) => m.key !== key));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg border border-highlight/20 bg-highlight/8 text-highlight">
            <Brain className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Memory</h2>
            <p className="text-sm text-muted-foreground">
              Cortex remembers context about you across conversations.
            </p>
          </div>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActiveCategory("all")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            activeCategory === "all"
              ? "bg-highlight/10 text-highlight"
              : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          All
        </button>
        {MEMORY_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              activeCategory === cat
                ? "bg-highlight/10 text-highlight"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {filteredMemories.length}{" "}
          {filteredMemories.length === 1 ? "memory" : "memories"}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setEditingMemory(null);
            setShowForm(!showForm);
          }}
          className="gap-1.5"
        >
          {showForm ? (
            <X className="size-3.5" />
          ) : (
            <Plus className="size-3.5" />
          )}
          {showForm ? "Cancel" : "Add memory"}
        </Button>
      </div>

      {/* New memory form */}
      <AnimatePresence>
        {showForm ? (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <Card>
              <CardContent className="p-4">
                <MemoryForm
                  onSubmit={handleCreate}
                  onCancel={() => setShowForm(false)}
                />
              </CardContent>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Edit memory form */}
      <AnimatePresence>
        {editingMemory ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <Card className="border-highlight/20">
              <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-highlight">
                  Editing: {editingMemory.key}
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => setEditingMemory(null)}
                >
                  <X className="size-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="p-3">
                <MemoryForm
                  initial={editingMemory}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditingMemory(null)}
                />
              </CardContent>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Error state */}
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadMemories()}
            className="ml-3"
          >
            Retry
          </Button>
        </div>
      ) : null}

      {/* Loading state */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="p-3 pb-1">
                <div className="cortex-skeleton h-3 w-[40%] rounded-full bg-current/10" />
              </CardHeader>
              <CardContent className="p-3">
                <div className="cortex-skeleton h-3 w-[90%] rounded-full bg-current/10" />
                <div className="cortex-skeleton mt-2 h-3 w-[60%] rounded-full bg-current/10" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Empty state */}
      {!loading && filteredMemories.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-14 text-center">
          <Brain className="size-10 text-muted-foreground/40" />
          <p className="mt-4 text-sm font-medium">No memories yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeCategory === "all"
              ? "Add a memory to help Cortex personalize responses."
              : `No memories in "${CATEGORY_LABELS[activeCategory]}".`}
          </p>
        </div>
      ) : null}

      {/* Memory grid */}
      {!loading && filteredMemories.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMemories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onEdit={() => {
                setShowForm(false);
                setEditingMemory(memory);
              }}
              onDelete={() => void handleDelete(memory.key)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
