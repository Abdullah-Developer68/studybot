"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  PanelLeft,
  Plus,
  MessageSquare,
  PencilLine,
  FileText,
  Settings,
  MoreHorizontal,
  Share2,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { assets } from "@studybot/assets";
import { Fragment, useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useChatSessions from "@/hooks/chat/useChatSessions";

// Sidebar width constants
const MIN_SIDEBAR_WIDTH = 56;
const MAX_SIDEBAR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 240;
// Below this width the sidebar switches to compact icon-only layout
const COMPACT_BREAKPOINT = 120;
// localStorage key for persisting the user's preferred sidebar width
const STORAGE_KEY = "sidebarWidth";

const navItems = [
  { icon: MessageSquare, label: "Chat", href: "/chat" },
  { icon: PencilLine, label: "Editor", href: "/editor" },
  { icon: FileText, label: "Templates", href: "/templates" },
];

// Helper to read the persisted width from localStorage (safe for SSR)
const getPersistedWidth = (): number => {
  if (typeof window === "undefined") return DEFAULT_SIDEBAR_WIDTH;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = Number(raw);
      if (!isNaN(parsed)) {
        return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, parsed));
      }
    }
  } catch {
    // localStorage unavailable (e.g. private browsing), fall back to default
  }
  return DEFAULT_SIDEBAR_WIDTH;
};

const Sidebar = () => {
  const pathname = usePathname();

  // Sidebar width is managed locally and persisted to localStorage so it
  // survives page reloads without needing Zustand for this concern.
  const [sidebarWidth, setSidebarWidthRaw] = useState(DEFAULT_SIDEBAR_WIDTH);

  // Hydrate from localStorage on mount (avoids SSR hydration mismatch)
  useEffect(() => {
    setSidebarWidthRaw(getPersistedWidth());
  }, []);

  // Wrapper that clamps the value and persists to localStorage
  const setSidebarWidth = useCallback((width: number) => {
    const clamped = Math.min(
      MAX_SIDEBAR_WIDTH,
      Math.max(MIN_SIDEBAR_WIDTH, width),
    );
    setSidebarWidthRaw(clamped);
    try {
      localStorage.setItem(STORAGE_KEY, String(clamped));
    } catch {
      // Silently ignore storage errors
    }
  }, []);

  const {
    threads,
    activeThreadId,
    isLoading,
    createThread,
    switchThread,
    renameThread,
    deleteThread,
  } = useChatSessions();

  const isCompact = sidebarWidth < COMPACT_BREAKPOINT;

  // --- Toggle button: switches between compact (56px) and default (240px) ---
  const handleToggle = useCallback(() => {
    if (isCompact) {
      setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
    } else {
      setSidebarWidth(MIN_SIDEBAR_WIDTH);
    }
  }, [isCompact, setSidebarWidth]);

  // --- Resize handling ------------------------------------------------

  const [isResizing, setIsResizing] = useState(false);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // The sidebar starts at x=0, so clientX directly maps to the width
      setSidebarWidth(e.clientX);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    // Prevent text selection while dragging
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  // --- Thread actions -------------------------------------------------

  const handleNewChat = async () => {
    await createThread("New Chat");
  };

  const handleSwitchThread = (threadId: string) => {
    switchThread(threadId);
  };

  // Tracks which thread is being renamed (null = none).
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus the input when entering edit mode.
  useEffect(() => {
    if (editingThreadId) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingThreadId]);

  const startRename = useCallback((threadId: string, currentTitle: string) => {
    setEditingThreadId(threadId);
    setEditTitle(currentTitle);
  }, []);

  const cancelRename = useCallback(() => {
    setEditingThreadId(null);
    setEditTitle("");
  }, []);

  const confirmRename = useCallback(async () => {
    if (!editingThreadId || !editTitle.trim()) {
      cancelRename();
      return;
    }
    await renameThread(editingThreadId, editTitle.trim());
    cancelRename();
  }, [editingThreadId, editTitle, renameThread, cancelRename]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        confirmRename();
      } else if (e.key === "Escape") {
        cancelRename();
      }
    },
    [confirmRename, cancelRename],
  );

  const handleDelete = useCallback(
    async (threadId: string) => {
      const confirmed = window.confirm(
        "Are you sure you want to delete this conversation?",
      );
      if (!confirmed) return;
      await deleteThread(threadId);
    },
    [deleteThread],
  );

  return (
    <aside
      style={{ width: sidebarWidth }}
      className="relative flex h-screen shrink-0 flex-col overflow-hidden border-r border-zinc-800 bg-zinc-950/95"
    >
      <div
        className="flex flex-1 flex-col py-3"
        style={{
          // When compact, hide overflowing text/content instead of wrapping
          opacity: isCompact ? undefined : 1,
          transition: "opacity 0.15s ease",
        }}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        {isCompact ? (
          // Compact header: nerdbot logo (same h-10 row as expanded) +
          // toggle button stacked below to avoid any vertical shift of the logo.
          <div className="mb-5 flex flex-col items-center gap-2 px-2">
            <div className="flex h-10 items-center justify-center">
              <img
                src={assets.nerdbot.src}
                alt="Studybot"
                className="h-8 w-8 shrink-0"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggle}
              className="h-9 w-9 cursor-pointer text-zinc-400 hover:text-white"
            >
              <PanelLeft className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          // Expanded header: title + toggle button to collapse
          <div className="mb-5 flex h-10 items-center justify-between px-3">
            <img
              src={assets.nerdbot.src}
              alt="Studybot"
              className="h-8 w-auto"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggle}
              className="h-8 w-8 shrink-0 cursor-pointer text-zinc-400 hover:text-white"
            >
              <PanelLeft className="h-4 w-4 rotate-180" />
            </Button>
          </div>
        )}

        {/* ── Navigation ──────────────────────────────────────────── */}
        {isCompact ? (
          // Compact mode: vertical icon-only nav with tooltips
          <TooltipProvider delayDuration={200}>
            <div className="flex flex-1 flex-col gap-1 px-2">
              {/* New Chat icon */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 cursor-pointer text-zinc-400 hover:text-white"
                    onClick={handleNewChat}
                    disabled={isLoading}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>New Chat</p>
                </TooltipContent>
              </Tooltip>

              {/* Route icons */}
              {navItems.map(({ icon: Icon, label, href }) => {
                const isActive =
                  pathname === href || pathname.startsWith(href + "/");
                return (
                  <Tooltip key={label}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-9 w-9 shrink-0 cursor-pointer",
                          isActive
                            ? "bg-zinc-800 text-white hover:bg-zinc-700 hover:text-white"
                            : "text-zinc-400 hover:text-white",
                        )}
                        asChild
                      >
                        <Link href={href}>
                          <Icon className="h-5 w-5" />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        ) : (
          // Expanded mode: full sidebar content
          <>
            {/* Route items — horizontal icon row with tooltips */}
            <div className="mb-2 flex flex-col gap-3 px-2">
              <TooltipProvider delayDuration={200}>
                <div className="flex items-center justify-center">
                  <div className="flex items-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 px-2">
                    {navItems.map(({ icon: Icon, label, href }, index) => {
                      const isActive =
                        pathname === href || pathname.startsWith(href + "/");
                      return (
                        <Fragment key={label}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  // Keep original hit area; kill ghost's full-button dark hover
                                  "group relative h-12 w-12 shrink-0 cursor-pointer hover:bg-transparent dark:hover:bg-transparent",
                                  isActive
                                    ? "text-white"
                                    : "text-zinc-500 hover:text-white",
                                )}
                                asChild
                              >
                                <Link href={href}>
                                  {/* Smaller hover surface so the highlight doesn't fill the whole button */}
                                  <span
                                    className={cn(
                                      "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                                      "group-hover:bg-zinc-700",
                                    )}
                                  >
                                    <Icon className="h-6 w-6" />
                                  </span>
                                  {/* Active underline indicator */}
                                  {isActive && (
                                    <span className="absolute bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-white" />
                                  )}
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>{label}</p>
                            </TooltipContent>
                          </Tooltip>
                          {/* Divider between items */}
                          {index < navItems.length - 1 && (
                            <div className="h-5 w-px shrink-0 bg-zinc-800" />
                          )}
                        </Fragment>
                      );
                    })}
                  </div>
                </div>
              </TooltipProvider>
            </div>

            {/* Divider */}
            <div className="mx-3 my-2 border-t border-zinc-800" />

            {/* New Chat full button */}
            <div className="px-2 pb-2">
              <Button
                variant="default"
                size="default"
                className="w-full cursor-pointer bg-white text-zinc-900 hover:bg-zinc-100"
                onClick={handleNewChat}
                disabled={isLoading}
              >
                New Chat
              </Button>
            </div>

            {/* Recent label */}
            <p className="px-4 pb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-600">
              Recent
            </p>

            {/* Chat threads — fixed height with scroll overflow */}
            <div className="flex h-115 flex-col gap-1 overflow-y-auto px-2">
              {threads.length === 0 ? (
                <div className="rounded-md border border-dashed border-zinc-800 px-3 py-3 text-sm text-zinc-500">
                  No chat sessions yet.
                </div>
              ) : (
                threads.map((thread) => {
                  const isActive = activeThreadId === thread.session_id;
                  const isEditing = editingThreadId === thread.session_id;

                  return (
                    <div
                      key={thread.session_id}
                      className={cn(
                        "group relative flex w-full items-center rounded-md pr-1 text-left",
                        isActive && "bg-zinc-800/70",
                      )}
                    >
                      {isEditing ? (
                        // Inline rename mode — title becomes an editable input.
                        <div className="flex flex-1 items-center gap-1 px-2 py-2">
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={handleRenameKeyDown}
                            className="min-w-0 flex-1 rounded border border-zinc-600 bg-zinc-800 px-1.5 py-0.5 text-sm text-white outline-none focus:border-zinc-400"
                          />
                          <button
                            type="button"
                            onClick={confirmRename}
                            className="shrink-0 rounded p-0.5 text-zinc-400 hover:text-white"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelRename}
                            className="shrink-0 rounded p-0.5 text-zinc-400 hover:text-white"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        // Normal display — clickable title + dropdown trigger.
                        <>
                          <button
                            type="button"
                            className="min-w-0 flex-1 cursor-pointer py-2 pl-2 text-left"
                            onClick={() =>
                              handleSwitchThread(thread.session_id)
                            }
                          >
                            <span className="block truncate text-sm text-zinc-300 group-hover:text-white">
                              {thread.title}
                            </span>
                          </button>

                          {/* Three-dot settings dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className={cn(
                                  "shrink-0 rounded p-1 text-zinc-500 opacity-0 hover:bg-zinc-700 hover:text-white group-hover:opacity-100",
                                  "data-[state=open]:opacity-100 data-[state=open]:bg-zinc-700 data-[state=open]:text-white",
                                )}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              side="bottom"
                              className="w-44 border-zinc-700 bg-zinc-900 text-zinc-200"
                            >
                              <DropdownMenuItem
                                inset
                                className="cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Share conversation — UI placeholder.
                                  // Full sharing flow to be implemented later.
                                }}
                              >
                                <Share2 className="h-4 w-4" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-zinc-700" />
                              <DropdownMenuItem
                                inset
                                className="cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startRename(thread.session_id, thread.title);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                inset
                                className="cursor-pointer text-red-400 hover:bg-zinc-800 hover:text-red-300 focus:bg-zinc-800 focus:text-red-300"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(thread.session_id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div
          className={cn(
            "mt-auto flex items-center",
            isCompact ? "flex-col gap-2 px-2" : "justify-between px-3 py-1",
          )}
        >
          {isCompact ? (
            // Compact footer: Settings icon + Avatar stacked
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 cursor-pointer text-zinc-400 hover:text-white"
                asChild
              >
                <Link href="/settings">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
              <Avatar className="h-8 w-8 shrink-0 cursor-pointer border border-zinc-700">
                <AvatarImage src={assets.defaultProfile.src} alt="Profile" />
                <AvatarFallback className="bg-zinc-800 text-[10px] text-white">
                  N
                </AvatarFallback>
              </Avatar>
            </>
          ) : (
            // Expanded footer: Avatar + Profile name on left, Settings on right
            <>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 shrink-0 cursor-pointer border border-zinc-700">
                  <AvatarImage src={assets.defaultProfile.src} alt="Profile" />
                  <AvatarFallback className="bg-zinc-800 text-[10px] text-white">
                    N
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-sm text-zinc-400">Profile</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 cursor-pointer text-zinc-400 hover:text-white"
                asChild
              >
                <Link href="/settings">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Resize handle ──────────────────────────────────────────── */}
      <div
        className={cn(
          "absolute right-0 top-0 z-10 h-full w-[4px] cursor-col-resize transition-colors",
          "hover:bg-zinc-600/40",
          isResizing && "bg-blue-500/60",
        )}
        onMouseDown={handleResizeStart}
      />
    </aside>
  );
};

export default Sidebar;
