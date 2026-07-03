"use client";

import { useContext } from "react";
import AuthContext from "@/app/context/AuthContext";
import type { AuthContextValue } from "@/types/context.types";

const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

export default useAuth;
