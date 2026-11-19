import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";

interface TenantSettings {
  logoUrl: string | null;
  phone: string | null;
  address: string | null;
  currency: string | null;
  primaryColor: string | null;
  receiptFooter: string | null;
  enabledModules?: unknown;
}

interface Subscription {
  plan: string;
  status: string;
  seatLimit: number;
  productLimit: number;
  currentPeriodEnd: string | null;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  industry: string;
  status: string;
  settings: TenantSettings | null;
  subscription: Subscription | null;
}

interface TenantContextValue {
  tenant: Tenant | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  // Starts true so screens wait for the business type instead of guessing.
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function fetchTenant() {
    if (!user || user.isSuperAdmin) return;
    setIsLoading(true);
    setError(null);
    api
      // /tenants/current works for every staff role. /tenants/settings needs
      // the settings.manage permission, so cashiers used to get no tenant
      // at all — and the app couldn't tell which menu to show them.
      .get("/tenants/current")
      .then((res) => setTenant(res.data.data))
      .catch(() => setError("Failed to load business settings"))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    if (!user || user.isSuperAdmin) {
      setTenant(null);
      setIsLoading(false);
      return;
    }
    fetchTenant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    document.title = tenant ? `${tenant.name} — AB BusinessHub` : "AB BusinessHub";
  }, [tenant]);

  return (
    <TenantContext.Provider value={{ tenant, isLoading, error, refetch: fetchTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
