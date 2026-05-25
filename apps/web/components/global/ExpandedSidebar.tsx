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

const navItems = [
  { icon: MessageSquare, label: "Chat", href: "/chat" },
  { icon: PencilLine, label: "Editor", href: "/editor" },
  { icon: FileText, label: "Templates", href: "/templates" },
];

type Props = {
  onCollapse: () => void;
};

const ExpandedSidebar = ({ onCollapse }: Props) => {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950/95">
      <div className="flex flex-1 flex-col overflow-hidden py-3">

        {/* Header: title + collapse button */}
        <div className="flex h-10 items-center justify-between px-3 mb-5">
          <span className="text-sm font-bold tracking-widest text-white">
            Studybot
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCollapse}
            className="h-8 w-8 shrink-0 cursor-pointer text-zinc-400 hover:text-white"
          >
            <PanelLeft className="h-4 w-4 rotate-180" />
          </Button>
        </div>

        {/* Nav items */}
        <div className="flex flex-col gap-3 px-2 mb-2">

          {/* Route items — horizontal icon row with tooltips */}
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center justify-center">
            <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden px-2">
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
                            "relative h-12 w-12 cursor-pointer shrink-0",
                            isActive
                              ? "text-white"
                              : "text-zinc-500 hover:text-white"
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
                        className="border-zinc-700 bg-zinc-900 text-zinc-100 text-xs"
                      >
                        {label}
                      </TooltipContent>
                    </Tooltip>
                    {/* Divider between items */}
                    {index < navItems.length - 1 && (
                      <div className="w-px h-5 bg-zinc-800 shrink-0" />
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
            className="w-full cursor-pointer bg-white text-zinc-900 hover:bg-zinc-100"
            asChild
          >
            <Link href="/chat">New Chat</Link>
          </Button>
        </div>

        {/* Recent label */}
        <p className="px-4 pb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-600">
          Recent
        </p>

        {/* Chat threads — scrollable */}
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto min-h-0 px-2">

          {/* Placeholder threads */}
          {[
            { title: "Explain quantum entanglement", time: "2m ago" },
            { title: "Help me write a cover letter", time: "1h ago" },
            { title: "Summarise this PDF", time: "3h ago" },
            { title: "Python list comprehensions", time: "Yesterday" },
            { title: "Essay on climate change", time: "Yesterday" },
            { title: "What is the Turing test?", time: "2d ago" },
            { title: "Solve this calculus problem", time: "2d ago" },
            { title: "Best practices for React hooks", time: "3d ago" },
            { title: "Summarise Newton's laws", time: "3d ago" },
            { title: "Write a haiku about the ocean", time: "4d ago" },
            { title: "Pros and cons of TypeScript", time: "4d ago" },
            { title: "How does photosynthesis work?", time: "5d ago" },
            { title: "Debug my Express server", time: "5d ago" },
            { title: "Outline a research paper", time: "6d ago" },
            { title: "Explain Big O notation", time: "6d ago" },
            { title: "Translate this to Spanish", time: "1w ago" },
            { title: "Compare SQL vs NoSQL", time: "1w ago" },
            { title: "Ideas for my history essay", time: "1w ago" },
            { title: "What caused World War I?", time: "2w ago" },
            { title: "Set up a Next.js project", time: "2w ago" },
          ].map((thread) => (
            <button
              key={thread.title}
              className="group flex w-full flex-col rounded-md px-2 py-2 text-left hover:bg-zinc-800/60 cursor-pointer"
            >
              <span className="truncate text-sm text-zinc-300 group-hover:text-white">
                {thread.title}
              </span>
              <span className="text-[11px] text-zinc-600">{thread.time}</span>
            </button>
          ))}
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
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 cursor-pointer text-zinc-400 hover:text-white"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>

      </div>
    </aside>
  );
};

export default ExpandedSidebar;
