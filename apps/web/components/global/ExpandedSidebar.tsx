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
import {
  useControlPanelActions,
  useIsPanelExpanded,
} from "@/stores/controlPanelStore";
import useChatSessions from "@/hooks/chat/useChatSessions";

const navItems = [
  { icon: MessageSquare, label: "Chat", href: "/chat" },
  { icon: PencilLine, label: "Editor", href: "/editor" },
  { icon: FileText, label: "Templates", href: "/templates" },
];

const ExpandedSidebar = () => {
  const pathname = usePathname();
  const expanded = useIsPanelExpanded();
  const { collapsePanel } = useControlPanelActions();
  const {
    threads,
    activeThreadId,
    isLoading,
    createThread,
    switchThread,
    renameThread,
    deleteThread,
  } = useChatSessions();

  const handleCollapse = () => collapsePanel();

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
    <div className="flex h-full w-56 flex-col">
      <div className="flex flex-1 flex-col overflow-hidden py-3">
        {/* Header: title + collapse button */}
        <div className="mb-5 flex h-10 items-center justify-between px-3">
          <span className="text-sm font-bold tracking-widest text-white">
            Studybot
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCollapse}
            className="h-8 w-8 shrink-0 cursor-pointer text-zinc-400 hover:text-white"
          >
            <PanelLeft className="h-4 w-4 rotate-180" />
          </Button>
        </div>

        {/* Nav items */}
        <div className="mb-2 flex flex-col gap-3 px-2">
          {/* Route items — horizontal icon row with tooltips */}
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
                              "relative h-12 w-12 shrink-0 cursor-pointer",
                              isActive
                                ? "text-white"
                                : "text-zinc-500 hover:text-white",
                            )}
                            asChild
                          >
                            <Link href={href}>
                              <Icon className="h-6 w-6" />
                              {/* Active underline indicator */}
                              {isActive && (
                                <span className="absolute bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-white" />
                              )}
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="bottom"
                          className="border-zinc-700 bg-zinc-900 text-xs text-zinc-100"
                        >
                          {label}
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

        {/* New Chat */}
        <div className="px-2 pb-2">
          <Button
            variant="default"
            size="default"
            className="w-full cursor-pointer bg-white text-zinc-900 hover:bg-zinc-100"
            onClick={handleNewChat}
            disabled={isLoading}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>

        {/* Recent label */}
        <p className="px-4 pb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-600">
          Recent
        </p>

        {/* Chat threads — scrollable */}
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2">
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
                        onClick={() => handleSwitchThread(thread.session_id)}
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

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-1">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 shrink-0 cursor-pointer border border-zinc-700">
              <AvatarImage src={assets.defaultProfile.src} alt="Profile" />
              <AvatarFallback className="bg-zinc-800 text-[10px] text-white">
                N
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm text-zinc-400">Profile</span>
          </div>
          {/* Settings icon navigates to the settings page.
              Only the active sidebar renders a real link so the hidden
              overlay doesn't add an extra focus stop. */}
          {expanded ? (
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
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 cursor-pointer text-zinc-400 hover:text-white"
              aria-hidden
              tabIndex={-1}
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpandedSidebar;
