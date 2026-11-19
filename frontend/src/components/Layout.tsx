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
  Building2,
  CreditCard,
  UtensilsCrossed,
  Layers,
  Wallet,
  LifeBuoy,
  LogOut,
  ShoppingBag,
  BookOpen,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import { useLanguage } from "../context/LanguageContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { isRestaurant } from "../lib/businessTypes";

interface NavItem {
  to: string;
  labelKey: string;
  labelEn: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  color: string;
}

// "for" decides which kind of business sees the item: restaurants get the
// counter/debts/daily-book screens, every other business type gets the shop
// screens (products, stock, sales). "all" = both.
type NavAudience = "all" | "restaurant" | "shop";

const NAV_ITEMS: (NavItem & { for: NavAudience })[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", labelEn: "Dashboard", icon: LayoutDashboard, color: "text-blue-500", for: "all" },
  { to: "/restaurant/counter", labelKey: "nav.restaurantCounter", labelEn: "Counter", icon: ShoppingBag, color: "text-emerald-600", for: "restaurant" },
  { to: "/restaurant/debts", labelKey: "nav.restaurantDebts", labelEn: "Debts", icon: Wallet, color: "text-amber-600", for: "restaurant" },
  { to: "/restaurant/daybook", labelKey: "nav.restaurantDaybook", labelEn: "Daily Book", icon: BookOpen, color: "text-blue-500", for: "restaurant" },
  { to: "/restaurant/menu", labelKey: "nav.restaurantMenu", labelEn: "Food Menu", icon: UtensilsCrossed, color: "text-amber-500", for: "restaurant" },
  { to: "/restaurant/tables", labelKey: "nav.restaurantTables", labelEn: "Tables", icon: Users, color: "text-purple-500", for: "restaurant" },
  { to: "/products", labelKey: "nav.products", labelEn: "Products", icon: Package, color: "text-blue-500", for: "shop" },
  { to: "/inventory", labelKey: "nav.inventory", labelEn: "Inventory", icon: PackagePlus, color: "text-green-500", for: "shop" },
  { to: "/sales", labelKey: "nav.sales", labelEn: "Sales", icon: ShoppingCart, color: "text-emerald-500", for: "shop" },
  { to: "/customers", labelKey: "nav.customers", labelEn: "Customers", icon: Users, color: "text-blue-500", for: "all" },
  { to: "/suppliers", labelKey: "nav.suppliers", labelEn: "Suppliers", icon: Truck, color: "text-amber-500", for: "all" },
  { to: "/expenses", labelKey: "nav.expenses", labelEn: "Expenses", icon: Receipt, color: "text-red-500", for: "all" },
  { to: "/reports", labelKey: "nav.reports", labelEn: "Reports", icon: BarChart2, color: "text-purple-500", for: "shop" },
  { to: "/plan", labelKey: "nav.plan", labelEn: "Plan", icon: CreditCard, color: "text-orange-500", for: "all" },
  { to: "/settings", labelKey: "nav.settings", labelEn: "Settings", icon: Settings, color: "text-gray-500", for: "all" },
];

const SUPER_ADMIN_NAV_ITEMS: NavItem[] = [
  { to: "/super-admin/dashboard", labelKey: "nav.dashboard", labelEn: "Dashboard", icon: LayoutDashboard, color: "text-blue-500" },
  { to: "/super-admin/tenants", labelKey: "nav.businesses", labelEn: "Businesses", icon: Building2, color: "text-emerald-500" },
  { to: "/super-admin/subscriptions", labelKey: "nav.subscriptions", labelEn: "Subscriptions", icon: CreditCard, color: "text-purple-500" },
  { to: "/super-admin/plans", labelKey: "nav.plans", labelEn: "Plans", icon: Layers, color: "text-amber-500" },
  { to: "/super-admin/payments", labelKey: "nav.payments", labelEn: "Payments", icon: Wallet, color: "text-blue-500" },
  { to: "/super-admin/users", labelKey: "nav.users", labelEn: "Users", icon: Users, color: "text-emerald-500" },
  { to: "/super-admin/analytics", labelKey: "nav.analytics", labelEn: "Analytics", icon: BarChart2, color: "text-purple-500" },
  { to: "/super-admin/support", labelKey: "nav.support", labelEn: "Support", icon: LifeBuoy, color: "text-amber-500" },
  { to: "/super-admin/settings", labelKey: "nav.settings", labelEn: "Settings", icon: Settings, color: "text-gray-500" },
];

const RESTRICTED_FOR_CASHIER = ["/suppliers", "/expenses", "/reports", "/settings", "/plan"];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { t } = useLanguage();

  const isCashier = user?.role?.name === "Cashier";
  // Until we know the business type, show only the shared items so the menu
  // doesn't flash shop items at a restaurant (or the reverse).
  const audience: NavAudience | null = tenant
    ? isRestaurant(tenant.industry) ? "restaurant" : "shop"
    : tenantLoading ? null : "shop";
  const visibleNavItems = NAV_ITEMS
    .filter((item) => item.for === "all" || item.for === audience)
    .filter((item) => !(isCashier && RESTRICTED_FOR_CASHIER.includes(item.to)));

  const displayName = user?.isSuperAdmin
    ? t("layout.platformAdmin", "Platform Admin")
    : tenant?.name ?? "AB BusinessHub";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-56 shrink-0 bg-white border-r border-gray-200 p-4 flex flex-col">
        <div className="flex items-center gap-3 px-2 pb-6">
          <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {initials}
          </div>
          <span className="text-sm font-semibold leading-tight text-gray-900">
            {displayName}
          </span>
        </div>

        <div className="px-2 pb-6">
          <LanguageSwitcher />
        </div>

        <nav className="flex flex-col gap-5">
          {!user?.isSuperAdmin && (
            <div>
              <div className="px-3 mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide">
                {t("nav.mainMenu", "Main Menu")}
              </div>
              <div className="flex flex-col gap-1">
                {visibleNavItems.map(({ to, labelKey, labelEn, icon: Icon, color }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/dashboard"}
                    className={({ isActive }) =>
                      isActive
                        ? "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-blue-600 text-white"
                        : "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={16} className={isActive ? "text-white" : color} />
                        {t(labelKey, labelEn)}
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
                {t("nav.superAdmin", "Super Admin")}
              </div>
              <div className="flex flex-col gap-1">
                {SUPER_ADMIN_NAV_ITEMS.map(({ to, labelKey, labelEn, icon: Icon, color }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/super-admin/dashboard"}
                    className={({ isActive }) =>
                      isActive
                        ? "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-blue-600 text-white"
                        : "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={16} className={isActive ? "text-white" : color} />
                        {t(labelKey, labelEn)}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="mt-auto pt-6">
          {user?.isSuperAdmin && (
            <div className="flex items-center gap-2 px-3 py-2 mb-2 border-t border-gray-100 pt-4">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
                {user.fullName?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.fullName}</p>
                <p className="text-xs text-gray-400 truncate">{t("layout.platformAdmin", "Platform Admin")}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full rounded-lg bg-red-50 hover:bg-red-100 px-3 py-2 text-sm font-medium text-red-600 transition-colors"
          >
            <LogOut size={16} className="text-red-500" />
            {t("layout.logout", "Log out")}
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
              {user?.role?.name ?? t("layout.superAdminRole", "Super Admin")}
            </p>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
