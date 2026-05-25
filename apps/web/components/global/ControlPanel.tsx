"use client";

import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import Navbar from "./Navbar";
import CompactSidebar from "./CompactSidebar";
import ExpandedSidebar from "./ExpandedSidebar";

const ControlPanel = () => {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);

  if (isMobile) return <Navbar />;

  if (expanded) return <ExpandedSidebar onCollapse={() => setExpanded(false)} />;

  return <CompactSidebar onExpand={() => setExpanded(true)} />;
};

export default ControlPanel;
