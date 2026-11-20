import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CreditCard, Layers, Wallet, Users, BarChart2, LifeBuoy, Settings } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { TenantProvider } from "./context/TenantContext";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SuperAdminRoute } from "./components/SuperAdminRoute";
import { RequireTenant } from "./components/RequireTenant";
import { Layout } from "./components/Layout";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { RegisterPage } from "./pages/RegisterPage";
import { HomeDashboard } from "./pages/HomeDashboard";
import { ProductsPage } from "./pages/ProductsPage";
import { InventoryPage } from "./pages/InventoryPage";
import { SalesPage } from "./pages/SalesPage";
import { CustomersPage } from "./pages/CustomersPage";
import { SuppliersPage } from "./pages/SuppliersPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SuperAdminDashboardPage } from "./pages/superadmin/SuperAdminDashboardPage";
import { SuperAdminTenantsPage } from "./pages/superadmin/SuperAdminTenantsPage";
import { SuperAdminTenantDetailPage } from "./pages/superadmin/SuperAdminTenantDetailPage";
import { ComingSoonPage } from "./pages/superadmin/ComingSoonPage";
import { RestaurantDashboardPage } from "./pages/RestaurantDashboardpage";
import { RestaurantMenuPage } from "./pages/RestaurantMenuPage";
import { RestaurantTablesPage } from "./pages/RestaurantTablesPage";
import { RestaurantCounterPage } from "./pages/RestaurantCounterPage";
import { RestaurantDebtsPage } from "./pages/RestaurantDebtsPage";
import { RestaurantDaybookPage } from "./pages/RestaurantDaybookPage";
import { TenantSubdomainApp } from "./TenantSubdomainApp";
import { PlanPage } from "./pages/PlanPage";
import { getCurrentSubdomain } from "./lib/tenantHost";

function withLayout(children: React.ReactNode) {
  return (
    <ProtectedRoute>
      <RequireTenant>
        <Layout>{children}</Layout>
      </RequireTenant>
    </ProtectedRoute>
  );
}

function withSuperAdminLayout(children: React.ReactNode) {
  return (
    <ProtectedRoute>
      <SuperAdminRoute>
        <Layout>{children}</Layout>
      </SuperAdminRoute>
    </ProtectedRoute>
  );
}

function DefaultRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.isSuperAdmin ? "/super-admin/dashboard" : "/dashboard"} replace />;
}

function AppRoutes() {
  const { t } = useLanguage();
  const subdomain = getCurrentSubdomain();

  if (subdomain) {
    return <TenantSubdomainApp slug={subdomain} />;
  }

  return (
    <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/dashboard" element={withLayout(<HomeDashboard />)} />
        <Route path="/restaurant" element={withLayout(<RestaurantDashboardPage />)} />
        <Route path="/restaurant-dashboard" element={withLayout(<RestaurantDashboardPage />)} />
        <Route path="/restaurant/menu" element={withLayout(<RestaurantMenuPage />)} />
        <Route path="/restaurant/tables" element={withLayout(<RestaurantTablesPage />)} />
        <Route path="/restaurant/counter" element={withLayout(<RestaurantCounterPage />)} />
        <Route path="/restaurant/debts" element={withLayout(<RestaurantDebtsPage />)} />
        <Route path="/restaurant/daybook" element={withLayout(<RestaurantDaybookPage />)} />
        <Route path="/products" element={withLayout(<ProductsPage />)} />
        <Route path="/inventory" element={withLayout(<InventoryPage />)} />
        <Route path="/sales" element={withLayout(<SalesPage />)} />
        <Route path="/customers" element={withLayout(<CustomersPage />)} />
        <Route path="/suppliers" element={withLayout(<SuppliersPage />)} />
        <Route path="/expenses" element={withLayout(<ExpensesPage />)} />
        <Route path="/reports" element={withLayout(<ReportsPage />)} />
        <Route path="/settings" element={withLayout(<SettingsPage />)} />
        <Route path="/plan" element={withLayout(<PlanPage />)} />

        <Route path="/super-admin" element={<Navigate to="/super-admin/dashboard" replace />} />
        <Route
          path="/super-admin/dashboard"
          element={withSuperAdminLayout(<SuperAdminDashboardPage />)}
        />
        <Route
          path="/super-admin/tenants"
          element={withSuperAdminLayout(<SuperAdminTenantsPage />)}
        />
        <Route
          path="/super-admin/tenants/:id"
          element={withSuperAdminLayout(<SuperAdminTenantDetailPage />)}
        />
        <Route
          path="/super-admin/subscriptions"
          element={withSuperAdminLayout(
            <ComingSoonPage
              title={t("superadmin.subscriptions.title", "Subscriptions")}
              description={t(
                "superadmin.subscriptions.description",
                "A dedicated subscriptions management view is on the way. For now, plan and status per business are visible from Businesses."
              )}
              icon={CreditCard}
            />
          )}
        />
        <Route
          path="/super-admin/plans"
          element={withSuperAdminLayout(
            <ComingSoonPage
              title={t("superadmin.plans.title", "Plans")}
              description={t(
                "superadmin.plans.description",
                "Editing plan pricing and limits from the UI is coming soon — limits are currently defined in the backend."
              )}
              icon={Layers}
            />
          )}
        />
        <Route
          path="/super-admin/payments"
          element={withSuperAdminLayout(
            <ComingSoonPage
              title={t("superadmin.payments.title", "Payments")}
              description={t(
                "superadmin.payments.description",
                "Payment history will appear here once billing is connected to a payment processor."
              )}
              icon={Wallet}
            />
          )}
        />
        <Route
          path="/super-admin/users"
          element={withSuperAdminLayout(
            <ComingSoonPage
              title={t("superadmin.users.title", "Users")}
              description={t(
                "superadmin.users.description",
                "A cross-tenant user directory is on the way."
              )}
              icon={Users}
            />
          )}
        />
        <Route
          path="/super-admin/analytics"
          element={withSuperAdminLayout(
            <ComingSoonPage
              title={t("superadmin.analytics.title", "Analytics")}
              description={t(
                "superadmin.analytics.description",
                "Deeper platform analytics are on the way — the Dashboard already covers the key metrics."
              )}
              icon={BarChart2}
            />
          )}
        />
        <Route
          path="/super-admin/support"
          element={withSuperAdminLayout(
            <ComingSoonPage
              title={t("superadmin.support.title", "Support")}
              description={t("superadmin.support.description", "A support ticket view is on the way.")}
              icon={LifeBuoy}
            />
          )}
        />
        <Route
          path="/super-admin/settings"
          element={withSuperAdminLayout(
            <ComingSoonPage
              title={t("superadmin.settings.title", "Settings")}
              description={t(
                "superadmin.settings.description",
                "Platform-wide settings are on the way."
              )}
              icon={Settings}
            />
          )}
        />

        <Route path="*" element={<DefaultRedirect />} />
      </Routes>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <TenantProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TenantProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
