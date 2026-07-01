"use client";

import type { ReactNode } from "react";
import { ProtectedRoute } from "@/components/auth";

const SettingsLayout = ({ children }: { children: ReactNode }) => {
  return <ProtectedRoute>{children}</ProtectedRoute>;
};

export default SettingsLayout;
