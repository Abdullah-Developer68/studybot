"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const ControlPanel = () => {
  const isMobile = useIsMobile();

  // On mobile the sidebar is replaced by a fixed top navbar.
  if (isMobile) return <Navbar />;

  // On desktop the single resizable sidebar lives in the normal layout
  // flow. Its width is controlled by dragging the right-edge handle.
  return <Sidebar />;
};

export default ControlPanel;
