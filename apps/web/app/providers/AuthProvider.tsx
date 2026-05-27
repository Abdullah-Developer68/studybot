"use client";

import { AuthProvider as AuthContextProvider } from "@/app/context/AuthContext";
import type { ReactNode } from "react";

const AuthProvider = ({ children }: { children: ReactNode }) => {
  return <AuthContextProvider>{children}</AuthContextProvider>;
};

export default AuthProvider;
