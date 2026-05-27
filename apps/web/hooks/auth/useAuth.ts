"use client";

import { useContext } from "react";
import AuthContext from "@/app/context/AuthContext";

type AuthContextValue = NonNullable<React.ContextType<typeof AuthContext>>;

const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

export default useAuth;
