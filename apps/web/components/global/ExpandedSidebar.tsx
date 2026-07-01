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
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { assets } from "@studybot/assets";
import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useControlPanelActions, useIsPanelExpanded } from "@/stores/controlPanelStore";
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
  const { threads, activeThreadId, isLoading, createThread, switchThread } =
    useChatSessions();

  const handleCollapse = () => collapsePanel();

  const handleNewChat = async () => {
    await createThread("New Chat");
  };

  const handleSwitchThread = (threadId: string) => {
    switchThread(threadId);
  };

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
              return (
                <button
                  key={thread.session_id}
                  type="button"
                  className={cn(
                    "group flex w-full flex-col rounded-md px-2 py-2 text-left cursor-pointer hover:bg-zinc-800/60",
                    isActive && "bg-zinc-800/70",
                  )}
                  onClick={() => handleSwitchThread(thread.session_id)}
                >
                  <span className="truncate text-sm text-zinc-300 group-hover:text-white">
                    {thread.title}
                  </span>
                  <span className="text-[11px] text-zinc-600">
                    {new Date(thread.updated_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </button>
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
