"use client";

import { ProtectedRoute } from "@/components/auth";

const ChatLayout = ({ children }) => {
  return <ProtectedRoute>{children}</ProtectedRoute>;
};

export default ChatLayout;
