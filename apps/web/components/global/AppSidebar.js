"use client";

import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  MessageSquare,
  PencilLine,
  FileChartPie,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const AppSidebar = () => {
  const [mode, setMode] = useState("chat");

  const modeButtons = [
    { key: "chat", label: "Chat", icon: MessageSquare },
    { key: "editor", label: "Editor", icon: PencilLine },
    { key: "templates", label: "Templates", icon: FileChartPie },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="px-3 pt-16 pb-2">
        <div className="flex justify-center">
          <div className="relative flex items-center gap-1 rounded-2xl bg-zinc-900/90 p-1 ring-1 ring-white/10 shadow-lg overflow-hidden">
            <div
              className="absolute inset-y-1 left-1 w-1/3 rounded-xl bg-white/10 shadow-[0_0_16px_rgba(255,255,255,0.08)] transition-transform duration-300 ease-out"
              style={{
                transform:
                  mode === "chat"
                    ? "translateX(0%)"
                    : mode === "editor"
                      ? "translateX(100%)"
                      : "translateX(200%)",
              }}
            />

            {modeButtons.map((item) => {
              const Icon = item.icon;
              const isActive = mode === item.key;

              return (
                <Tooltip key={item.key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setMode(item.key)}
                      aria-pressed={isActive}
                      aria-label={item.label}
                      className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-xl ring-1 transition-colors ${
                        isActive
                          ? "text-white ring-white/15"
                          : "bg-transparent text-white/70 ring-transparent hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="mt-6" />

      <SidebarFooter>
        <p className="text-sm text-gray-500">© 2024 My App</p>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
