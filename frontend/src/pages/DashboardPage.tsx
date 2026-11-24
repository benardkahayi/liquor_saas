import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Wallet, Receipt, Package, Plus, ChevronRight } from "lucide-react";
import { api } from "../api/client";
import { money } from "../lib/money";
import { useLanguage } from "../context/LanguageContext";
import { useTenant } from "../context/TenantContext";
import { useAuth } from "../context/AuthContext";
import { ErrorBanner, extractErrorMessage } from "../components/ErrorBanner";
import { MonthlyRevenueChart } from "../components/charts/MonthlyRevenueChart";

// The shop dashboard (every business type except restaurants), laid out like
// the original BizSmart dashboard: four month cards, revenue & profit by
// month beside the latest sales, then the value of the stock on hand.

interface Overview {
  thisMonth: { revenue: number; costOfGoods: number; expenses: number; profit: number };
  months: { month: string; label: string; revenue: number; profit: number }[];
  today: { sales: number; salesCount: number; profit: number; expenses: number };
  products: { count: number; lowStock: number };
  stock: {
    costValue: number;
    retailValue: number;
    shown: number;
    total: number;
    items: {
      id: string;
      name: string;
      stockQuantity: number;
      minStockLevel: number;
      purchasePrice: number;
      sellingPrice: number;
      stockValue: number;
      low: boolean;
    }[];
  };
  recentSales: {
    id: string;
    customer: string | null;
    total: number;
    createdAt: string;
    itemCount: number;
    methods: string[];
  }[];
}

const num = (n: number) => Math.round(n).toLocaleString();

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function when(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function DashboardPage() {
  const { t } = useLanguage();
  const { tenant } = useTenant();
  const { user } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ data: Overview }>("/dashboard/overview")
      .then((res) => setData(res.data.data))
      .catch((err) => setError(extractErrorMessage(err, t("dashboard.error", "Failed to load dashboard"))));
  }, [t]);

  const storeName = tenant?.name ?? t("dashboard.title", "Dashboard");
  const m = data?.thisMonth;
  const methodLabel: Record<string, string> = {
    CASH: t("dash.cash", "Cash"),
    MOBILE_MONEY: t("dash.mobile", "Mobile money"),
    CARD: t("dash.card", "Card"),
    OTHER: t("dash.other", "Other"),
  };

  const cards = [
    {
      label: t("dash.revenue", "Revenue"),
      value: m ? num(m.revenue) : "—",
      sub: data ? `${t("dash.thisMonth", "TZS this month")} · ${t("dash.today", "today")} ${num(data.today.sales)}` : "",
      icon: TrendingUp,
      iconCls: "bg-blue-100 text-blue-600",
      accent: "bg-blue-500",
      valueCls: "text-gray-900",
      to: "/sales",
    },
    {
      label: t("dash.netProfit", "Net profit"),
      value: m ? num(m.profit) : "—",
      sub: t("dash.netProfitHint", "TZS this month, after stock cost and expenses"),
      icon: Wallet,
      iconCls: "bg-green-100 text-green-600",
      accent: "bg-green-500",
      valueCls: m && m.profit < 0 ? "text-red-600" : "text-green-600",
      to: "/reports",
    },
    {
      label: t("dash.expenses", "Expenses"),
      value: m ? num(m.expenses) : "—",
      sub: data ? `${t("dash.thisMonth", "TZS this month")} · ${t("dash.today", "today")} ${num(data.today.expenses)}` : "",
      icon: Receipt,
      iconCls: "bg-red-100 text-red-600",
      accent: "bg-red-500",
      valueCls: "text-gray-900",
      to: "/expenses",
    },
    {
      label: t("dash.products", "Products"),
      value: data ? String(data.products.count) : "—",
      sub: data
        ? data.products.lowStock > 0
          ? `${data.products.lowStock} ${t("dash.lowOnStock", "low on stock")}`
          : t("dash.allStocked", "all well stocked")
        : "",
      subCls: data && data.products.lowStock > 0 ? "font-medium text-amber-700" : undefined,
      icon: Package,
      iconCls: "bg-amber-100 text-amber-600",
      accent: "bg-amber-500",
      valueCls: "text-gray-900",
      to: "/inventory",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      {/* Store header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-bold text-white shadow-sm">
            {initials(storeName)}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-gray-900">{storeName}</h1>
            <p className="text-sm text-gray-500">
              {t("dash.welcome", "Welcome back")}
              {user?.fullName ? `, ${user.fullName}` : ""}
            </p>
          </div>
        </div>
        <Link to="/sales" className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm">
          <Plus size={18} aria-hidden />
          {t("dash.newSale", "New sale")}
        </Link>
      </div>

      <ErrorBanner message={error} />

      {/* Month cards */}
      <div className="mb-8 mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.label}
              to={c.to}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`h-1 ${c.accent}`} />
              <div className="p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium uppercase tracking-wide text-gray-500">{c.label}</span>
                  <span className={`shrink-0 rounded-lg p-2 ${c.iconCls}`}>
                    <Icon size={18} aria-hidden />
                  </span>
                </div>
                <div className={`text-xl font-semibold tabular-nums sm:text-2xl ${c.valueCls}`}>{c.value}</div>
                <div className={`mt-1 text-xs ${c.subCls ?? "text-gray-400"}`}>{c.sub}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Chart + recent sales */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t("dash.byMonth", "Revenue & profit by month")}
            </h2>
            <span className="text-xs text-gray-400">{t("dash.last6", "Last 6 months, TZS")}</span>
          </div>
          {data && data.months.some((x) => x.revenue > 0) ? (
            <MonthlyRevenueChart months={data.months} height={300} />
          ) : (
            <div className="flex h-60 flex-col items-center justify-center text-center">
              <span className="mb-3 rounded-full bg-blue-100 p-3 text-blue-600">
                <TrendingUp size={20} aria-hidden />
              </span>
              <p className="text-sm text-gray-500">{t("dash.noSalesYet", "No sales data yet")}</p>
              <p className="mt-1 text-xs text-gray-400">{t("dash.chartHint", "The chart appears once you record sales")}</p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t("dash.recentSales", "Recent sales")}
            </h2>
            <Link to="/sales" className="flex items-center text-xs font-medium text-blue-600 hover:underline">
              {t("dash.viewAll", "View all")} <ChevronRight size={14} aria-hidden />
            </Link>
          </div>
          {data && data.recentSales.length === 0 ? (
            <p className="text-sm text-gray-400">
              {t("dash.noSales", "No sales yet.")}{" "}
              <Link to="/sales" className="font-medium text-blue-600 hover:underline">
                {t("dash.firstSale", "Record your first sale")}
              </Link>
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {(data?.recentSales ?? []).map((s) => {
                const name = s.customer ?? t("dash.walkIn", "Walk-in");
                return (
                  <div key={s.id} className="-mx-1 flex items-center gap-3 rounded-lg px-1 py-2 text-sm hover:bg-gray-50">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700">
                      {initials(name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-gray-900">{name}</div>
                      <div className="text-xs text-gray-400">
                        {when(s.createdAt)} · {s.itemCount} {s.itemCount === 1 ? t("dash.item", "item") : t("dash.items", "items")}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-medium tabular-nums text-green-600">{num(s.total)}</div>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {s.methods.map((x) => methodLabel[x] ?? x).join(" + ")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Stock value (cost of goods) */}
      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t("dash.costOfGoods", "Cost of goods")}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              {t("dash.costOfGoodsHint", "What the stock you hold cost you, product by product")}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xl font-semibold tabular-nums text-gray-900">{data ? num(data.stock.costValue) : "—"}</div>
            <div className="text-xs text-gray-400">
              {t("dash.stockValue", "TZS stock value")}
              {data ? ` · ${t("dash.sellsFor", "sells for")} ${money(data.stock.retailValue)}` : ""}
            </div>
          </div>
        </div>
        {data && data.stock.items.length === 0 ? (
          <p className="p-5 text-sm text-gray-400">
            {t("dash.noProducts", "No products yet.")}{" "}
            <Link to="/products" className="font-medium text-blue-600 hover:underline">
              {t("dash.addProduct", "Add a product")}
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="p-4 font-medium">{t("dash.col.product", "Product")}</th>
                  <th className="p-4 text-right font-medium">{t("dash.col.inStock", "In stock")}</th>
                  <th className="p-4 text-right font-medium">{t("dash.col.costUnit", "Cost / unit")}</th>
                  <th className="p-4 text-right font-medium">{t("dash.col.price", "Selling price")}</th>
                  <th className="p-4 text-right font-medium">{t("dash.col.stockValue", "Stock value")}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.stock.items ?? []).map((p) => (
                  <tr key={p.id} className="border-t border-gray-100 transition-colors hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">{p.name}</td>
                    <td className="p-4 text-right tabular-nums text-gray-600">
                      {p.low && (
                        <span className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {t("dash.low", "Low")}
                        </span>
                      )}
                      {p.stockQuantity}
                    </td>
                    <td className="p-4 text-right tabular-nums text-gray-600">{num(p.purchasePrice)}</td>
                    <td className="p-4 text-right tabular-nums text-gray-600">{num(p.sellingPrice)}</td>
                    <td className="p-4 text-right font-medium tabular-nums text-gray-900">{num(p.stockValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data && data.stock.total > data.stock.shown && (
              <p className="border-t border-gray-100 p-4 text-xs text-gray-400">
                {t("dash.topShown", "Showing the {n} products worth the most.").replace("{n}", String(data.stock.shown))}{" "}
                <Link to="/products" className="text-blue-600 hover:underline">
                  {t("dash.allProducts", "All products")}
                </Link>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
