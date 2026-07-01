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

const CompactSidebar = () => {
  const pathname = usePathname();
  const expanded = useIsPanelExpanded();
  const { expandPanel } = useControlPanelActions();
  const { createThread, isLoading } = useChatSessions();

  const handleNewChat = async () => {
    await createThread("New Chat");
  };

  return (
    <div className="flex h-full w-14 flex-col">
      <div className="flex flex-1 flex-col py-3">
        {/* Toggle */}
        <div className="mb-3 flex px-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={expandPanel}
            className="h-9 w-9 cursor-pointer text-zinc-400 hover:text-white"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* Nav items */}
        <div className="flex flex-1 flex-col gap-1 px-2">
          {/* New Chat */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 cursor-pointer text-zinc-400 hover:text-white"
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
          </TooltipProvider>

          {/* Route items */}
          <TooltipProvider>
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
                        "h-9 w-9 cursor-pointer",
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
          </TooltipProvider>
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center gap-2 px-2">
          {/* Settings icon navigates to the settings page.
              Only the visible compact sidebar renders a real link so the
              expanded overlay doesn't add an extra focus stop. */}
          {!expanded ? (
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
          <Avatar className="h-8 w-8 shrink-0 cursor-pointer border border-zinc-700">
            <AvatarImage src={assets.defaultProfile.src} alt="Profile" />
            <AvatarFallback className="bg-zinc-800 text-[10px] text-white">
              N
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
};

export default CompactSidebar;
