"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  Bot,
  Check,
  ChevronDown,
  Clipboard,
  Command,
  Edit3,
  Loader2,
  Menu,
  MessageSquarePlus,
  MoreHorizontal,
  RefreshCcw,
  Search,
  Send,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  CORTEX_MODELS,
  DEFAULT_CORTEX_MODEL,
  type CortexConversation,
  messageText,
  titleFromMessages,
} from "@/lib/cortex/chat";
import { cn } from "@/lib/utils";

const examplePrompts = [
  "Shape a focused launch plan for a new AI feature.",
  "Review this architecture for the risks that matter.",
  "Turn rough product notes into a crisp executive brief.",
];

const smoothEase = [0.22, 1, 0.36, 1] as const;

type ApiConversation = {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
};

type CommandAction = {
  id: string;
  label: string;
  meta: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
};

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

function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className ?? "");
          const code = String(children).replace(/\n$/, "");

          if (match) {
            return (
              <SyntaxHighlighter
                PreTag="div"
                language={match[1]}
                style={oneDark}
                customStyle={{
                  margin: 0,
                  borderRadius: "0.5rem",
                  padding: "1rem",
                  fontSize: "0.8125rem",
                }}
              >
                {code}
              </SyntaxHighlighter>
            );
          }

          return (
            <code
              className={cn(
                "rounded bg-muted px-1.5 py-0.5 font-mono text-[0.86em]",
                className,
              )}
              {...props}
            >
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-2 text-muted-foreground">
      <span className="cortex-typing-dot" />
      <span className="cortex-typing-dot [animation-delay:140ms]" />
      <span className="cortex-typing-dot [animation-delay:280ms]" />
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="space-y-1.5 p-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="cortex-skeleton rounded-lg p-2.5"
        >
          <div className="h-3 w-[74%] rounded-full bg-current/10" />
          <div className="mt-2 h-2.5 w-[48%] rounded-full bg-current/10" />
        </div>
      ))}
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="space-y-5 py-5">
      <div className="ml-auto max-w-[86%] rounded-lg bg-primary/90 px-4 py-3 md:max-w-[62%]">
        <div className="h-3 w-52 rounded-full bg-primary-foreground/20" />
        <div className="mt-2 h-3 w-36 rounded-full bg-primary-foreground/15" />
      </div>
      <div className="max-w-[90%] rounded-lg border border-border bg-card px-4 py-4 md:max-w-[74%]">
        <div className="cortex-skeleton h-3 w-[82%] rounded-full" />
        <div className="cortex-skeleton mt-3 h-3 w-[94%] rounded-full" />
        <div className="cortex-skeleton mt-3 h-3 w-[68%] rounded-full" />
        <div className="cortex-skeleton mt-5 h-20 rounded-lg" />
      </div>
    </div>
  );
}

function ModelSelector({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (model: string) => void;
}) {
  const active =
    CORTEX_MODELS.find((model) => model.id === value) ?? CORTEX_MODELS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-9 min-w-0 justify-between gap-2 rounded-lg bg-card/80 px-3 shadow-sm hover:border-highlight/25"
        >
          <span className="min-w-0 truncate">{active.label}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(18rem,calc(100vw-1rem))] p-1.5">
        <DropdownMenuLabel className="px-2 py-2">Model</DropdownMenuLabel>
        {CORTEX_MODELS.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => onChange(model.id)}
            className="items-start gap-3 p-2.5 transition-colors"
          >
            <span className="mt-1 flex size-5 items-center justify-center rounded-full border border-border">
              {model.id === value ? <Check className="size-3" /> : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{model.label}</span>
              <span className="block text-xs text-muted-foreground">
                {model.vendor} - {model.hint}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ConversationList({
  conversations,
  activeId,
  loading,
  onNew,
  onSelect,
  onRename,
  onDelete,
}: {
  conversations: CortexConversation[];
  activeId: string | null;
  loading: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-border/80 bg-sidebar/80">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/80 px-3.5">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-highlight/12 text-highlight ring-1 ring-highlight/20">
            <Bot className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">Chats</p>
            <p className="text-[11px] text-muted-foreground">Recent work</p>
          </div>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 hover:shadow-sm"
          onClick={onNew}
          aria-label="New chat"
        >
          <MessageSquarePlus className="size-4" />
        </Button>
      </div>

      <div className="cortex-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? <ConversationSkeleton /> : null}

        {!loading && conversations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-5 text-center">
            <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-card text-highlight shadow-sm">
              <Sparkles className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium">A quiet start</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Start one useful thread. Cortex will keep the workspace organized.
            </p>
          </div>
        ) : null}

        <AnimatePresence initial={false}>
          {conversations.map((conversation) => {
            const active = conversation.id === activeId;
            const editing = conversation.id === editingId;

            return (
              <motion.div
                key={conversation.id}
                layout
                initial={{ opacity: 0, y: 6, scale: 0.985 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -8, scale: 0.985 }}
                transition={{ duration: 0.18, ease: smoothEase }}
                className={cn(
                  "group mb-1 rounded-lg transition-[background-color,box-shadow,transform] duration-150 ease-out",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "hover:bg-sidebar-accent/55 hover:shadow-sm",
                )}
              >
                <div className="flex min-h-11 items-center gap-1 px-2 py-1.5">
                  {editing ? (
                    <form
                      className="min-w-0 flex-1"
                      onSubmit={(event) => {
                        event.preventDefault();
                        onRename(conversation.id, draft);
                        setEditingId(null);
                      }}
                    >
                      <input
                        autoFocus
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onBlur={() => {
                          onRename(conversation.id, draft);
                          setEditingId(null);
                        }}
                        className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none transition-shadow focus:ring-2 focus:ring-ring"
                      />
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelect(conversation.id)}
                      className="min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="block truncate text-[13px] font-medium">
                        {conversation.title}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {conversation.model}
                      </span>
                    </button>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setDraft(conversation.title);
                          setEditingId(conversation.id);
                        }}
                      >
                        <Edit3 className="size-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(conversation.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CommandPalette({
  actions,
  onClose,
}: {
  actions: CommandAction[];
  onClose: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (action) =>
        action.label.toLowerCase().includes(q) ||
        action.meta.toLowerCase().includes(q),
    );
  }, [actions, query]);

  const selectedIndex = Math.min(selected, Math.max(filtered.length - 1, 0));

  React.useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  return (
    <div className="fixed inset-0 z-[70] bg-black/35 p-2 backdrop-blur-sm md:p-8">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Close command palette"
      />
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.985 }}
        transition={{ duration: 0.18, ease: smoothEase }}
        className="relative mx-auto mt-14 max-w-2xl overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl md:mt-16"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-3 border-b border-border px-3.5 md:px-4">
          <Search className="size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose();
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setSelected((value) =>
                  filtered.length === 0
                    ? 0
                    : Math.min(value + 1, filtered.length - 1),
                );
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setSelected((value) => Math.max(value - 1, 0));
              }
              if (event.key === "Enter") {
                event.preventDefault();
                filtered[selectedIndex]?.run();
                onClose();
              }
            }}
            placeholder="Search actions, chats, models..."
            className="h-13 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground md:h-14"
          />
          <Command className="size-4 text-muted-foreground" />
        </div>
        <div className="cortex-scrollbar max-h-[min(24rem,calc(100dvh-10rem))] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No matching actions
            </div>
          ) : null}
          {filtered.map((action, index) => (
            <button
              key={action.id}
              type="button"
              onMouseEnter={() => setSelected(index)}
              onClick={() => {
                action.run();
                onClose();
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                selectedIndex === index && "bg-accent text-accent-foreground",
              )}
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
                <action.icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {action.label}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {action.meta}
                </span>
              </span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export function CortexChat() {
  const router = useRouter();
  const [input, setInput] = React.useState("");
  const [conversations, setConversations] = React.useState<CortexConversation[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [selectedModel, setSelectedModel] =
    React.useState<string>(DEFAULT_CORTEX_MODEL);
  const [loadingConversations, setLoadingConversations] = React.useState(true);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const activeIdRef = React.useRef<string | null>(null);
  const modelRef = React.useRef<string>(DEFAULT_CORTEX_MODEL);
  const skipNextMessageLoadRef = React.useRef<string | null>(null);

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    error,
    regenerate,
    stop,
    clearError,
  } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    experimental_throttle: 35,
    onFinish: async ({ messages: finishedMessages }) => {
      const conversationId = activeIdRef.current;
      if (!conversationId) return;

      try {
        const result = await api<{ ok: true; title: string }>(
          `/api/conversations/${conversationId}/messages`,
          {
            method: "PUT",
            body: JSON.stringify({ messages: finishedMessages }),
          },
        );

        setConversations((items) =>
          items
            .map((item) =>
              item.id === conversationId
                ? {
                    ...item,
                    title: result.title,
                    model: modelRef.current,
                    updatedAt: new Date().toISOString(),
                  }
                : item,
            )
            .sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime(),
            ),
        );
      } catch {
        // Keep the streamed transcript visible. The next successful send will
        // replace the persisted transcript for this conversation.
      }
    },
  });

  const isBusy = status === "submitted" || status === "streaming";
  const activeConversation = conversations.find((item) => item.id === activeId);
  const lastMessage = messages.at(-1);
  const showTyping =
    status === "submitted" ||
    (status === "streaming" &&
      lastMessage?.role === "assistant" &&
      messageText(lastMessage).length === 0);

  React.useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  React.useEffect(() => {
    modelRef.current = selectedModel;
  }, [selectedModel]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadConversations() {
      setLoadingConversations(true);
      try {
        const result = await api<{ conversations: ApiConversation[] }>(
          "/api/conversations",
        );
        if (cancelled) return;
        const items = result.conversations;
        setConversations(items);
        if (items[0]) {
          setActiveId(items[0].id);
          setSelectedModel(items[0].model || DEFAULT_CORTEX_MODEL);
        }
      } finally {
        if (!cancelled) setLoadingConversations(false);
      }
    }

    loadConversations();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }

    if (skipNextMessageLoadRef.current === activeId) {
      skipNextMessageLoadRef.current = null;
      return;
    }

    let cancelled = false;
    setLoadingMessages(true);
    setMessages([]);

    api<{ messages: UIMessage[] }>(`/api/conversations/${activeId}/messages`)
      .then((result) => {
        if (!cancelled) setMessages(result.messages);
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeId, setMessages]);

  React.useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status, loadingMessages]);

  React.useEffect(() => {
    if (!copiedId) return;
    const timeout = window.setTimeout(() => setCopiedId(null), 1400);
    return () => window.clearTimeout(timeout);
  }, [copiedId]);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function createConversation(model = selectedModel) {
    clearError();
    const result = await api<{ conversation: CortexConversation }>(
      "/api/conversations",
      {
        method: "POST",
        body: JSON.stringify({ model }),
      },
    );
    setConversations((items) => [result.conversation, ...items]);
    skipNextMessageLoadRef.current = result.conversation.id;
    setActiveId(result.conversation.id);
    setSelectedModel(result.conversation.model);
    setMessages([]);
    setMobileSidebarOpen(false);
    textareaRef.current?.focus();
    return result.conversation;
  }

  async function ensureConversation() {
    if (activeId) return activeId;
    const conversation = await createConversation(selectedModel);
    return conversation.id;
  }

  async function submitPrompt(prompt: string) {
    const text = prompt.trim();
    if (!text || isBusy) return;

    clearError();
    const conversationId = await ensureConversation();
    sendMessage(
      { text },
      {
        body: {
          conversationId,
          model: selectedModel,
        },
      },
    );
    setInput("");
    textareaRef.current?.focus();
  }

  async function selectConversation(id: string) {
    if (id === activeId) return;
    stop();
    const conversation = conversations.find((item) => item.id === id);
    if (conversation) {
      setSelectedModel(conversation.model || DEFAULT_CORTEX_MODEL);
    }
    setActiveId(id);
    setMobileSidebarOpen(false);
  }

  async function renameConversation(id: string, title: string) {
    const previous = conversations;
    const nextTitle = title.trim() || "New chat";
    setConversations((items) =>
      items.map((item) => (item.id === id ? { ...item, title: nextTitle } : item)),
    );
    try {
      await api(`/api/conversations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: nextTitle }),
      });
    } catch {
      setConversations(previous);
    }
  }

  async function deleteConversation(id: string) {
    const previous = conversations;
    setConversations((items) => items.filter((item) => item.id !== id));
    if (activeId === id) {
      const next = conversations.find((item) => item.id !== id);
      setActiveId(next?.id ?? null);
      if (!next) setMessages([]);
    }

    try {
      await api(`/api/conversations/${id}`, { method: "DELETE" });
    } catch {
      setConversations(previous);
    }
  }

  async function changeModel(model: string) {
    setSelectedModel(model);
    if (!activeId) return;
    setConversations((items) =>
      items.map((item) => (item.id === activeId ? { ...item, model } : item)),
    );
    await api(`/api/conversations/${activeId}`, {
      method: "PATCH",
      body: JSON.stringify({ model }),
    });
  }

  async function retryMessage(messageId?: string) {
    if (!activeId) return;
    regenerate({
      messageId,
      body: {
        conversationId: activeId,
        model: selectedModel,
      },
    });
  }

  async function copyResponse(message: UIMessage) {
    const text = messageText(message);
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedId(message.id);
  }

  const commandActions: CommandAction[] = [
    {
      id: "new-chat",
      label: "New chat",
      meta: "Start a fresh conversation",
      icon: MessageSquarePlus,
      run: () => void createConversation(),
    },
    ...conversations.map((conversation) => ({
      id: `conversation-${conversation.id}`,
      label: conversation.title,
      meta: "Switch conversation",
      icon: Bot,
      run: () => void selectConversation(conversation.id),
    })),
    ...CORTEX_MODELS.map((model) => ({
      id: `model-${model.id}`,
      label: model.label,
      meta: `Switch model - ${model.vendor}`,
      icon: Sparkles,
      run: () => void changeModel(model.id),
    })),
    {
      id: "nav-projects",
      label: "Projects",
      meta: "Navigate",
      icon: Search,
      run: () => router.push("/projects"),
    },
    {
      id: "nav-settings",
      label: "Workspace settings",
      meta: "Navigate",
      icon: Search,
      run: () => router.push("/settings"),
    },
  ];

  const sidebar = (
    <ConversationList
      conversations={conversations}
      activeId={activeId}
      loading={loadingConversations}
      onNew={() => void createConversation()}
      onSelect={(id) => void selectConversation(id)}
      onRename={(id, title) => void renameConversation(id, title)}
      onDelete={(id) => void deleteConversation(id)}
    />
  );

  return (
    <div className="grid h-full min-h-[calc(100dvh-3.5rem)] bg-background md:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="hidden min-h-0 md:block">{sidebar}</div>

      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-[min(92vw,19rem)] p-0">
          <SheetTitle className="sr-only">Conversations</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>

      <AnimatePresence>
        {paletteOpen ? (
          <CommandPalette
            actions={commandActions}
            onClose={() => setPaletteOpen(false)}
          />
        ) : null}
      </AnimatePresence>

      <main className="flex min-h-0 flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/80 bg-background/85 px-3 backdrop-blur-xl md:gap-3 md:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 md:hidden"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open conversations"
            >
              <Menu className="size-4" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">
                {activeConversation?.title ?? "New conversation"}
              </p>
              <p className="truncate text-xs text-muted-foreground transition-colors">
                {isBusy ? "Composing response" : "Ready"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden size-9 sm:inline-flex"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command palette"
            >
              <Command className="size-4" />
            </Button>
            <ModelSelector
              value={selectedModel}
              disabled={isBusy}
              onChange={(model) => void changeModel(model)}
            />
          </div>
        </div>

        <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col px-3 py-4 sm:px-4 md:px-8 md:py-5">
          <div className="cortex-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            {loadingMessages ? (
              <MessageSkeleton />
            ) : messages.length === 0 ? (
              <div className="flex min-h-full flex-col justify-center py-10 md:py-12">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: smoothEase }}
                  className="max-w-2xl space-y-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-highlight">
                    Cortex chat
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
                    Make the next thought clearer.
                  </h2>
                  <p className="text-[15px] leading-relaxed text-muted-foreground">
                    Start with a question, a rough note, or a decision. Cortex
                    keeps the thread, the model, and the working surface steady.
                  </p>
                </motion.div>
                <div className="mt-7 grid gap-2.5 md:mt-8 md:grid-cols-3 md:gap-3">
                  {examplePrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void submitPrompt(prompt)}
                      className="rounded-lg border border-border bg-card p-4 text-left text-sm leading-relaxed text-card-foreground shadow-sm outline-none transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-highlight/30 hover:bg-accent hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5 py-3 md:space-y-6 md:py-4">
                {messages.map((message) => {
                  const text = messageText(message);
                  const isAssistant = message.role === "assistant";
                  const isLastStreamingMessage =
                    isAssistant &&
                    message.id === lastMessage?.id &&
                    status === "streaming";

                  return (
                    <motion.article
                      key={message.id}
                      initial={{ opacity: 0, y: 8, scale: 0.992 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, ease: smoothEase }}
                      className={cn(
                        "flex gap-3",
                        message.role === "user" && "justify-end",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[92%] rounded-lg px-4 py-3 text-sm shadow-sm transition-shadow duration-200 md:max-w-[78%]",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-card text-card-foreground hover:shadow-md",
                        )}
                      >
                        {isAssistant ? (
                          <div className="cortex-markdown">
                            <MarkdownMessage content={text} />
                            {isLastStreamingMessage ? (
                              <span className="cortex-stream-cursor" />
                            ) : null}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {text}
                          </p>
                        )}

                        {isAssistant && text ? (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.16, ease: smoothEase }}
                            className="mt-3 flex items-center gap-1 border-t border-border/70 pt-2"
                          >
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => void copyResponse(message)}
                              className="h-7 px-2 text-muted-foreground"
                            >
                              {copiedId === message.id ? (
                                <Check className="size-3.5" />
                              ) : (
                                <Clipboard className="size-3.5" />
                              )}
                              {copiedId === message.id ? "Copied" : "Copy"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => void retryMessage(message.id)}
                              disabled={isBusy}
                              className="h-7 px-2 text-muted-foreground"
                            >
                              <RefreshCcw className="size-3.5" />
                              Retry
                            </Button>
                          </motion.div>
                        ) : null}
                      </div>
                    </motion.article>
                  );
                })}

                {showTyping ? (
                  <article className="flex gap-3">
                    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
                      <TypingIndicator />
                    </div>
                  </article>
                ) : null}

                <AnimatePresence>
                {error ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.16, ease: smoothEase }}
                    className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span>Cortex could not complete that response.</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void retryMessage()}
                        disabled={isBusy || !activeId}
                      >
                        <RefreshCcw className="size-3.5" />
                        Retry
                      </Button>
                    </div>
                  </motion.div>
                ) : null}
                </AnimatePresence>

                <div ref={scrollRef} />
              </div>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitPrompt(input);
            }}
            className="mt-3 rounded-xl border border-border bg-card p-2 shadow-sm transition-[border-color,box-shadow] duration-200 focus-within:border-highlight/25 focus-within:shadow-md md:mt-4"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submitPrompt(input);
                }
              }}
              rows={3}
              placeholder="Message Cortex..."
              disabled={isBusy}
              className="max-h-40 min-h-18 w-full resize-none bg-transparent px-3 py-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-20"
            />
            <div className="flex items-center justify-between gap-2 px-1 pb-1">
              <div className="hidden min-w-0 truncate text-xs text-muted-foreground sm:block">
                {activeConversation
                  ? titleFromMessages(messages) || activeConversation.title
                  : "Unsaved draft"}
              </div>
              <div className="ml-auto flex items-center gap-2">
                {isBusy ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={stop}
                  >
                    <Square className="size-3.5" />
                    Stop
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  size="sm"
                  disabled={!input.trim() || isBusy}
                >
                  {isBusy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
