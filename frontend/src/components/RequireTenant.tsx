import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function RequireTenant({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  if (user?.isSuperAdmin) {
    return <Navigate to="/super-admin" replace />;
  }

  return <>{children}</>;
}
