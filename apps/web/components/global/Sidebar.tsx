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

const Sidebar = () => {
  const modes = [
    { icon: MessageSquare, label: "Chat" },
    { icon: PencilLine, label: "Editor" },
    { icon: FileText, label: "Templates" },
  ];

  return (
    <aside className="sidebar flex h-screen w-14 flex-col border-r border-zinc-800 bg-zinc-950/95">
      <div className="flex flex-1 flex-col items-center py-4">
        <div className="flex flex-1 flex-col items-center gap-4">
          {/* Sidebar Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 cursor-pointer text-zinc-400 hover:text-white"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
          {/* Menu Specific Buttons */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 cursor-pointer text-zinc-400 hover:text-white"
          >
            <Plus className="h-5 w-5" />
          </Button>
          {/* Tooltip Menu Buttons */}
          <TooltipProvider>
            {modes.map(({ icon: Icon, label }) => (
              <Tooltip key={label}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 cursor-pointer text-zinc-400 hover:text-white"
                  >
                    <Icon className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
        {/* Sidebar footer */}
        <div className="flex flex-col items-center gap-4 pb-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 cursor-pointer text-zinc-400 hover:text-white"
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Avatar className="h-8 w-8 cursor-pointer border border-zinc-700">
            <AvatarImage src="/profile-pic.png" alt="Profile" />
            <AvatarFallback className="bg-zinc-800 text-[10px] text-white">
              N
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
