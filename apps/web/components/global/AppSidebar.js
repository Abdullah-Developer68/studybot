"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  MessageSquare,
  PencilLine,
  FileChartPie,
  Plus,
  Settings2,
  PanelLeftIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import useAuth from "@/hooks/auth/useAuth";
import Image from "next/image";
import { assets } from "@studybot/assets/asset";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const AppSidebar = () => {
  const { user } = useAuth();
  const { toggleSidebar } = useSidebar();

  const quickActions = [
    { key: "chat", label: "Chat", icon: MessageSquare },
    { key: "editor", label: "Editor", icon: PencilLine },
    { key: "templates", label: "Templates", icon: FileChartPie },
  ];

  const avatarSrc =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    user?.user_metadata?.image ||
    assets.chillGuy;

  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "User";

  return (
    <Sidebar className="border-r border-white/10 *:data-[sidebar=sidebar]:bg-zinc-950/95">
      <SidebarHeader className="px-2 pt-3 pb-2 flex flex-col gap-4">
        <div className="flex items-center px-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 rounded-xl hover:bg-white/10 hover:text-white text-white/70"
            onClick={toggleSidebar}
          >
            <PanelLeftIcon className="size-5" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </div>

        {/* New Chat Button */}
        <Button className="w-full h-10 justify-center gap-2 rounded-xl bg-white px-4 font-medium text-black hover:bg-gray-200">
          <span>New Chat</span>
          <Plus className="size-4" />
        </Button>

        {/* Horizontal Quick Actions */}
        <div className="flex w-full flex-row items-center gap-1 rounded-2xl bg-zinc-900/90 p-1 ring-1 ring-white/10 shadow-lg overflow-hidden">
          <TooltipProvider delayDuration={0}>
            {quickActions.map((item) => {
              const Icon = item.icon;
              return (
                <Tooltip key={item.key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={item.label}
                      title={item.label}
                      className="relative z-10 flex h-8 flex-1 items-center justify-center rounded-lg ring-1 transition-colors bg-transparent text-white/70 ring-transparent hover:bg-white/5 hover:text-white"
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 mt-2">
        {/* Main sidebar content (e.g. chat history) will go here */}
      </SidebarContent>

      <SidebarFooter className="px-3 pb-4">
        {/* Profile and Settings */}
        <div className="flex items-center w-full gap-3 rounded-2xl bg-zinc-900/50 p-2 ring-1 ring-white/10">
          <button
            type="button"
            aria-label="Profile"
            className="h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10 transition-transform hover:scale-[1.02]"
          >
            <Image
              src={avatarSrc}
              alt="Profile"
              width={32}
              height={32}
              className="h-full w-full object-cover"
            />
          </button>

          <span className="flex-1 truncate text-sm font-medium text-white/90">
            {userName}
          </span>

          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Settings"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/70 ring-1 ring-transparent transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                Settings
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
