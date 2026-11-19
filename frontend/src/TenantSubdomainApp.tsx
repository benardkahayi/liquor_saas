import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Building2, ShieldAlert, ShieldOff } from "lucide-react";
import { api } from "./api/client";
import { useAuth } from "./context/AuthContext";
import { useTenant } from "./context/TenantContext";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { TenantErrorPage } from "./pages/TenantErrorPage";
import { goToBase } from "./lib/tenantHost";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { HomeDashboard } from "./pages/HomeDashboard";
import { ProductsPage } from "./pages/ProductsPage";
import { InventoryPage } from "./pages/InventoryPage";
import { SalesPage } from "./pages/SalesPage";
import { CustomersPage } from "./pages/CustomersPage";
import { SuppliersPage } from "./pages/SuppliersPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { RestaurantDashboardPage } from "./pages/RestaurantDashboardpage";
import { RestaurantMenuPage } from "./pages/RestaurantMenuPage";
import { RestaurantTablesPage } from "./pages/RestaurantTablesPage";
import { RestaurantCounterPage } from "./pages/RestaurantCounterPage";
import { RestaurantDebtsPage } from "./pages/RestaurantDebtsPage";
import { RestaurantDaybookPage } from "./pages/RestaurantDaybookPage";

type SlugCheck = "loading" | "not-found" | "suspended" | "ok";

function withTenantLayout(children: React.ReactNode) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export function TenantSubdomainApp({ slug }: { slug: string }) {
  const [slugCheck, setSlugCheck] = useState<SlugCheck>("loading");
  const { user, isLoading: authLoading } = useAuth();
  const { tenant, isLoading: tenantLoading } = useTenant();

  // Checked independently of login state via the public endpoint, so an
  // unknown or suspended subdomain shows the right message even to a
  // visitor who was never logged in at all.
  useEffect(() => {
    api
      .get(`/tenants/by-slug/${slug}`)
      .then(() => setSlugCheck("ok"))
      .catch((err) => setSlugCheck(err?.response?.status === 403 ? "suspended" : "not-found"));
  }, [slug]);

  if (slugCheck === "loading" || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (slugCheck === "not-found") {
    return (
      <TenantErrorPage
        icon={Building2}
        title="Business not found"
        message={`There's no business at "${slug}". Check the address, or head to the homepage.`}
      />
    );
  }

  if (slugCheck === "suspended") {
    return (
      <TenantErrorPage
        icon={ShieldOff}
        title="Account suspended"
        message="This business account has been suspended. Contact support for help."
      />
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  if (user.isSuperAdmin) {
    goToBase("/super-admin/dashboard");
    return null;
  }

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (tenant && tenant.slug !== slug) {
    return (
      <TenantErrorPage
        icon={ShieldAlert}
        title="You don't have access to this business"
        message="Your account is signed in, but it belongs to a different business than this one."
      />
    );
  }

  return (
    <Routes>
      <Route path="/dashboard" element={withTenantLayout(<HomeDashboard />)} />
      <Route path="/restaurant" element={withTenantLayout(<RestaurantDashboardPage />)} />
      <Route path="/restaurant-dashboard" element={withTenantLayout(<RestaurantDashboardPage />)} />
      <Route path="/restaurant/menu" element={withTenantLayout(<RestaurantMenuPage />)} />
      <Route path="/restaurant/tables" element={withTenantLayout(<RestaurantTablesPage />)} />
      <Route path="/restaurant/counter" element={withTenantLayout(<RestaurantCounterPage />)} />
      <Route path="/restaurant/debts" element={withTenantLayout(<RestaurantDebtsPage />)} />
      <Route path="/restaurant/daybook" element={withTenantLayout(<RestaurantDaybookPage />)} />
      <Route path="/products" element={withTenantLayout(<ProductsPage />)} />
      <Route path="/inventory" element={withTenantLayout(<InventoryPage />)} />
      <Route path="/sales" element={withTenantLayout(<SalesPage />)} />
      <Route path="/customers" element={withTenantLayout(<CustomersPage />)} />
      <Route path="/suppliers" element={withTenantLayout(<SuppliersPage />)} />
      <Route path="/expenses" element={withTenantLayout(<ExpensesPage />)} />
      <Route path="/reports" element={withTenantLayout(<ReportsPage />)} />
      <Route path="/settings" element={withTenantLayout(<SettingsPage />)} />
      <Route path="*" element={withTenantLayout(<HomeDashboard />)} />
    </Routes>
  );
}
