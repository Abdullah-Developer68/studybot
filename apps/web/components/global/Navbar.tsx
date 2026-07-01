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
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import useChatSessions from "@/hooks/chat/useChatSessions";

const navItems = [
  { icon: MessageSquare, label: "Chat", href: "/chat" },
  { icon: PencilLine, label: "Editor", href: "/editor" },
  { icon: FileText, label: "Templates", href: "/templates" },
];

const Navbar = () => {
  const pathname = usePathname();
  const { createThread, isLoading } = useChatSessions();

  const handleNewChat = async () => {
    await createThread("New Chat");
  };

  return (
    <nav className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-3">
      {/* Left: panel toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 cursor-pointer text-zinc-400 hover:text-white"
      >
        <PanelLeft className="h-5 w-5" />
      </Button>

      {/* Center: nav icons with tooltips */}
      <TooltipProvider>
        <div className="flex items-center gap-1">
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
            <TooltipContent side="bottom">
              <p>New Chat</p>
            </TooltipContent>
          </Tooltip>

          {navItems.map(({ icon: Icon, label, href }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 cursor-pointer",
                    pathname === href
                      ? "text-white"
                      : "text-zinc-400 hover:text-white",
                  )}
                  asChild
                >
                  <Link href={href}>
                    <Icon className="h-5 w-5" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      {/* Right: settings + avatar */}
      <div className="flex items-center gap-2">
        {/* Settings icon navigates to the settings page */}
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
        <Avatar className="h-8 w-8 cursor-pointer border border-zinc-700">
          <AvatarImage src="/profile-pic.png" alt="Profile" />
          <AvatarFallback className="bg-zinc-800 text-[10px] text-white">
            N
          </AvatarFallback>
        </Avatar>
      </div>
    </nav>
  );
};

export default Navbar;
