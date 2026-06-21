"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@studybot/supabase";
import { createClient } from "@/utils/supabase/client";
import {
  useIsSettingsMenuOpen,
  useIsPanelExpanded,
  useControlPanelActions,
} from "@/stores/controlPanelStore";
import { useIsMobile } from "@/hooks/use-mobile";

// Browser supabase client used only for auth operations
const supabaseClient = createClient();

interface SettingsMenuProps {
  children: ReactNode;
}

const SettingsMenu = ({ children }: SettingsMenuProps) => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const expanded = useIsPanelExpanded();
  const isOpen = useIsSettingsMenuOpen();
  const { openSettingsMenu, closeSettingsMenu } = useControlPanelActions();

  // Signs the user out via Supabase and redirects to the auth page
  const handleLogout = async () => {
    try {
      await logout(supabaseClient);
      router.push("/auth");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const side = isMobile ? "bottom" : expanded ? "top" : "right";
  const align = isMobile ? "end" : expanded ? "end" : "start";

  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={(open) => (open ? openSettingsMenu() : closeSettingsMenu())}
    >
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>

      <DropdownMenuContent
        side={side}
        align={align}
        sideOffset={8}
        className="w-52 max-w-[calc(100vw-1rem)] border-zinc-800 bg-zinc-900 text-zinc-100"
      >
        {/* Section label */}
        <DropdownMenuLabel
          inset={false}
          className="text-xs font-medium uppercase tracking-wider text-zinc-500"
        >
          Settings
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />

        {/* Theme switcher - UI only, logic to be wired later */}
        <DropdownMenuLabel
          inset={false}
          className="pb-1 text-xs text-zinc-500"
        >
          Theme
        </DropdownMenuLabel>
        <div className="flex gap-1 px-2 pb-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 flex-1 cursor-pointer gap-1.5 px-2 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <Sun className="h-3.5 w-3.5 shrink-0" />
            Light
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 flex-1 cursor-pointer gap-1.5 px-2 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <Moon className="h-3.5 w-3.5 shrink-0" />
            Dark
          </Button>
        </div>

        <DropdownMenuSeparator className="bg-zinc-800" />

        {/* Profile item - UI only, logic to be wired later */}
        <DropdownMenuItem
          inset={false}
          className="cursor-pointer gap-2 text-zinc-300 focus:bg-zinc-800 focus:text-white"
        >
          <User className="h-4 w-4" />
          Profile
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-zinc-800" />

        {/* Logout - functional */}
        <DropdownMenuItem
          inset={false}
          onClick={handleLogout}
          className="cursor-pointer gap-2 text-red-400 focus:bg-red-500/10 focus:text-red-300"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SettingsMenu;
