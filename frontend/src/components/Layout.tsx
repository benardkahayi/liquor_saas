import { useEffect, useState } from "react";
import type { ReactNode, ComponentType } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTheme, type ThemeChoice } from "../lib/theme";
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
  Menu,
  X,
  Sun,
  Moon,
  MonitorSmartphone,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import { useLanguage } from "../context/LanguageContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { InstallAppButton } from "./InstallAppButton";
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
  const location = useLocation();

  // On phones and tablets the menu is a drawer opened from the top bar;
  // it closes by itself when you pick a page.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Light / dark. "Auto" follows the device (and battery saver on phones
  // that turn dark with it).
  const { choice: theme, setChoice: setTheme, isDark } = useTheme();
  useEffect(() => {
    // Also colour the page behind the app, so over-scrolling on phones
    // doesn't flash white.
    document.documentElement.style.backgroundColor = isDark ? "#0b1120" : "";
    document.documentElement.style.colorScheme = isDark ? "dark" : "";
    return () => {
      document.documentElement.style.backgroundColor = "";
      document.documentElement.style.colorScheme = "";
    };
  }, [isDark]);
  const themeOptions: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
    { value: "system", label: t("theme.auto", "Auto"), icon: MonitorSmartphone },
    { value: "light", label: t("theme.light", "Light"), icon: Sun },
    { value: "dark", label: t("theme.dark", "Dark"), icon: Moon },
  ];

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
    <div className={`min-h-screen flex bg-gray-50 ${isDark ? "app-dark" : ""}`}>
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white p-4 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-56 lg:translate-x-0 ${
          menuOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-2 pb-6">
          <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {initials}
          </div>
          <span className="flex-1 text-sm font-semibold leading-tight text-gray-900">
            {displayName}
          </span>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
            aria-label={t("layout.closeMenu", "Close menu")}
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-2 pb-6">
          <LanguageSwitcher />
          <div
            role="radiogroup"
            aria-label={t("theme.label", "Appearance")}
            className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1"
          >
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                onClick={() => setTheme(value)}
                title={value === "system" ? t("theme.autoHint", "Follows your phone or computer (dark when it is dark)") : label}
                className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium ${
                  theme === value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
          <InstallAppButton variant="menu" className="mt-2" />
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
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="-ml-1 rounded-lg p-2 text-gray-700 hover:bg-gray-100 lg:hidden"
            aria-label={t("layout.openMenu", "Open menu")}
          >
            <Menu size={22} />
          </button>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 lg:hidden">
            {displayName}
          </span>
          <div className="hidden flex-1 lg:block" />
          <div className="w-8 h-8 shrink-0 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
            {user?.fullName?.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 leading-tight">{user?.fullName}</p>
            <p className="text-xs text-gray-500 leading-tight">
              {user?.role?.name ?? t("layout.superAdminRole", "Super Admin")}
            </p>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
