import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import { getCurrentSubdomain, goToTenant } from "../lib/tenantHost";

export function RequireTenant({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { tenant, isLoading } = useTenant();

  if (user?.isSuperAdmin) {
    return <Navigate to="/super-admin/dashboard" replace />;
  }

  // The tenant app only lives on {slug}.domain — a bookmark or stale link
  // to /dashboard on the base domain should land on the right subdomain,
  // not render tenant data on the wrong origin.
  if (!getCurrentSubdomain()) {
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      );
    }
    if (tenant) {
      goToTenant(tenant.slug, window.location.pathname);
      return null;
    }
  }

  return <>{children}</>;
}
