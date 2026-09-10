import type { ReactNode, ComponentType } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  ShoppingCart,
  Users,
  Truck,
  Receipt,
  BarChart2,
  Settings,
  Shield,
  Building2,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  color: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-blue-500" },
  { to: "/products", label: "Products", icon: Package, color: "text-blue-500" },
  { to: "/inventory", label: "Inventory", icon: PackagePlus, color: "text-green-500" },
  { to: "/sales", label: "Sales", icon: ShoppingCart, color: "text-emerald-500" },
  { to: "/customers", label: "Customers", icon: Users, color: "text-blue-500" },
  { to: "/suppliers", label: "Suppliers", icon: Truck, color: "text-amber-500" },
  { to: "/expenses", label: "Expenses", icon: Receipt, color: "text-red-500" },
  { to: "/reports", label: "Reports", icon: BarChart2, color: "text-purple-500" },
  { to: "/settings", label: "Settings", icon: Settings, color: "text-gray-500" },
];

const SUPER_ADMIN_NAV_ITEMS: NavItem[] = [
  { to: "/super-admin", label: "Platform Stats", icon: Shield, color: "text-purple-500" },
  { to: "/super-admin/tenants", label: "Tenants", icon: Building2, color: "text-blue-500" },
];

const RESTRICTED_FOR_CASHIER = ["/suppliers", "/expenses", "/reports", "/settings"];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { tenant } = useTenant();

  const isCashier = user?.role?.name === "Cashier";
  const visibleNavItems = isCashier
    ? NAV_ITEMS.filter((item) => !RESTRICTED_FOR_CASHIER.includes(item.to))
    : NAV_ITEMS;

  const displayName = user?.isSuperAdmin ? "Platform Admin" : tenant?.name ?? "Liquor Store SaaS";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-56 shrink-0 bg-white border-r border-gray-200 p-4 flex flex-col">
        <div className="flex items-center gap-3 px-2 pb-8">
          <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {initials}
          </div>
          <span className="text-sm font-semibold leading-tight text-gray-900">
            {displayName}
          </span>
        </div>

        <nav className="flex flex-col gap-5">
          {!user?.isSuperAdmin && (
            <div>
              <div className="px-3 mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide">
                Main Menu
              </div>
              <div className="flex flex-col gap-1">
                {visibleNavItems.map(({ to, label, icon: Icon, color }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      isActive
                        ? "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-blue-600 text-white"
                        : "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={16} className={isActive ? "text-white" : color} />
                        {label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )}

          {user?.isSuperAdmin && (
            <div>
              <div className="px-3 mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide">
                Super Admin
              </div>
              <div className="flex flex-col gap-1">
                {SUPER_ADMIN_NAV_ITEMS.map(({ to, label, icon: Icon, color }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/super-admin"}
                    className={({ isActive }) =>
                      isActive
                        ? "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-blue-600 text-white"
                        : "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={16} className={isActive ? "text-white" : color} />
                        {label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="mt-auto pt-6">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full rounded-lg bg-red-50 hover:bg-red-100 px-3 py-2 text-sm font-medium text-red-600 transition-colors"
          >
            <LogOut size={16} className="text-red-500" />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-end gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
            {user?.fullName?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 leading-tight">{user?.fullName}</p>
            <p className="text-xs text-gray-500 leading-tight">
              {user?.role?.name ?? "Super Admin"}
            </p>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
