"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import Navbar from "./Navbar";
import CompactSidebar from "./CompactSidebar";
import ExpandedSidebar from "./ExpandedSidebar";
import { useIsPanelExpanded } from "@/stores/controlPanelStore";
import { cn } from "@/lib/utils";

const ControlPanel = () => {
  const isMobile = useIsMobile();
  const expanded = useIsPanelExpanded();

  if (isMobile) return <Navbar />;


  return (
    <aside
      className={cn(
        "relative flex h-screen shrink-0 flex-col overflow-hidden border-r border-zinc-800 bg-zinc-950/95 transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        expanded ? "w-56" : "w-14",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          expanded ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
        <CompactSidebar />
      </div>
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          expanded ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <ExpandedSidebar />
      </div>
    </aside>
  );
};

export default ControlPanel;
