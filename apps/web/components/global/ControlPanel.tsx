"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import Navbar from "./Navbar";
import CompactSidebar from "./CompactSidebar";
import ExpandedSidebar from "./ExpandedSidebar";
import { useControlPanelStore } from "@/stores/controlPanelStore";

const ControlPanel = () => {
  const isMobile = useIsMobile();
  const expanded = useControlPanelStore((state) => state.expanded);

  if (isMobile) return <Navbar />;

  if (expanded) return <ExpandedSidebar />;

  return <CompactSidebar />;
};

export default ControlPanel;
