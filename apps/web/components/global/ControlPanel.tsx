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

  // On mobile the sidebar is replaced by a fixed top navbar.
  if (isMobile) return <Navbar />;

  return (
    <>
      {/* Compact sidebar lives in the normal layout flow at a constant
          width so the main content area never reflows when the panel is
          expanded or collapsed. */}
      <aside className="relative flex h-screen w-14 shrink-0 flex-col overflow-hidden border-r border-zinc-800 bg-zinc-950/95">
        <CompactSidebar />
      </aside>

      {/* Expanded sidebar renders as a fixed overlay that floats on top of
          the content instead of pushing it. It cross-fades via opacity so
          the main content width stays stable during the switch. The
          background is fully opaque so underlying content is never visible
          while the panel is open. */}
      <div
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-56 shrink-0 flex-col overflow-hidden border-r border-zinc-800 bg-zinc-950 transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          expanded ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <ExpandedSidebar />
      </div>
    </>
  );
};

export default ControlPanel;
