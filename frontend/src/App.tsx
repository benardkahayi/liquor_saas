import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { TenantProvider } from "./context/TenantContext";
import { useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SuperAdminRoute } from "./components/SuperAdminRoute";
import { RequireTenant } from "./components/RequireTenant";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
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
  return <Navigate to={user?.isSuperAdmin ? "/super-admin" : "/dashboard"} replace />;
}

function App() {
  return (
    <AuthProvider>
      <TenantProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/dashboard" element={withLayout(<DashboardPage />)} />
          <Route path="/products" element={withLayout(<ProductsPage />)} />
          <Route path="/inventory" element={withLayout(<InventoryPage />)} />
          <Route path="/sales" element={withLayout(<SalesPage />)} />
          <Route path="/customers" element={withLayout(<CustomersPage />)} />
          <Route path="/suppliers" element={withLayout(<SuppliersPage />)} />
          <Route path="/expenses" element={withLayout(<ExpensesPage />)} />
          <Route path="/reports" element={withLayout(<ReportsPage />)} />
          <Route path="/settings" element={withLayout(<SettingsPage />)} />

          <Route path="/super-admin" element={withSuperAdminLayout(<SuperAdminDashboardPage />)} />
          <Route
            path="/super-admin/tenants"
            element={withSuperAdminLayout(<SuperAdminTenantsPage />)}
          />
          <Route
            path="/super-admin/tenants/:id"
            element={withSuperAdminLayout(<SuperAdminTenantDetailPage />)}
          />

          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </BrowserRouter>
      </TenantProvider>
    </AuthProvider>
  );
}

export default App;
