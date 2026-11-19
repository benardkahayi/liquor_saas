import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  CircleDollarSign,
  CreditCard,
  Wallet,
  Plus,
  Users,
  ClipboardList,
  UtensilsCrossed,
  ChevronRight,
} from "lucide-react";
import { api } from "../api/client";
import { money, toNum } from "../lib/money";
import { ErrorBanner, extractErrorMessage } from "../components/ErrorBanner";
import { useLanguage } from "../context/LanguageContext";
import { useTenant } from "../context/TenantContext";

// This page renders inside the app's main <Layout> (sidebar + header), so it
// must NOT draw its own sidebar or header — doing so showed two menus.

interface RestaurantSummary {
  todaySales: number | string;
  paymentsReceived: number | string;
  outstandingDebts: number | string;
  todayExpenses: number | string;
  ordersToday: number;
  customersServedToday: number;
  recentOrders: Array<{
    id: string;
    customer: string;
    items: string;
    total: number;
    paid: number;
    status: string;
    createdAt: string;
  }>;
  tables: { total: number; available: number; occupied: number };
}

function statusBadge(status: string) {
  switch (status) {
    case "PAID":
      return { label: "Paid", labelKey: "rdash.status.paid", cls: "bg-emerald-100 text-emerald-700" };
    case "PARTIALLY_PAID":
      return { label: "Partial", labelKey: "rdash.status.partial", cls: "bg-amber-100 text-amber-700" };
    default:
      return { label: "Unpaid", labelKey: "rdash.status.unpaid", cls: "bg-red-100 text-red-700" };
  }
}

export function RestaurantDashboardPage() {
  const { t } = useLanguage();
  const { tenant } = useTenant();
  const [summary, setSummary] = useState<RestaurantSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ data: RestaurantSummary }>("/dashboard/restaurant-summary")
      .then((res) => setSummary(res.data.data))
      .catch((err) =>
        setError(extractErrorMessage(err, t("dashboard.error", "Failed to load restaurant dashboard")))
      );
  }, [t]);

  const debts = toNum(summary?.outstandingDebts);

  const cards = [
    {
      title: t("rdash.todaySales", "Today's Sales"),
      amount: summary ? money(summary.todaySales) : "—",
      hint: `${summary?.ordersToday ?? 0} ${t("rdash.ordersToday", "orders today")}`,
      icon: ShoppingBag,
      color: "bg-blue-100 text-blue-600",
      to: "/restaurant/daybook",
    },
    {
      title: t("rdash.payments", "Payments Received"),
      amount: summary ? money(summary.paymentsReceived) : "—",
      hint: t("rdash.paymentsHint", "Today, including old debts paid"),
      icon: CircleDollarSign,
      color: "bg-green-100 text-green-600",
      to: "/restaurant/daybook",
    },
    {
      title: t("rdash.debts", "Outstanding Debts"),
      amount: summary ? money(summary.outstandingDebts) : "—",
      hint: debts > 0 ? t("rdash.debtsHint", "Tap to see who owes") : t("rdash.noDebts", "Nobody owes you"),
      icon: CreditCard,
      color: "bg-orange-100 text-orange-600",
      to: "/restaurant/debts",
      warn: debts > 0,
    },
    {
      title: t("rdash.expenses", "Today's Expenses"),
      amount: summary ? money(summary.todayExpenses) : "—",
      hint: t("rdash.expensesHint", "Recorded in Expenses"),
      icon: Wallet,
      color: "bg-purple-100 text-purple-600",
      to: "/expenses",
    },
  ];

  const recentOrders = summary?.recentOrders ?? [];
  const tables = summary?.tables ?? { total: 0, available: 0, occupied: 0 };

  return (
    <div className="space-y-7 text-slate-800">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {tenant?.name ?? t("rdash.title", "Restaurant")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("rdash.subtitle", "Today's business at a glance.")}
          </p>
        </div>

        <Link
          to="/restaurant/counter"
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          <Plus size={18} />
          {t("rdash.newOrder", "New Order")}
        </Link>
      </section>

      <ErrorBanner message={error} />

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              to={card.to}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-slate-500">{card.title}</p>
                  <p className="mt-3 text-xl font-bold tracking-tight text-slate-900">{card.amount}</p>
                </div>
                <div className={`shrink-0 rounded-xl p-3 ${card.color}`}>
                  <Icon size={22} />
                </div>
              </div>
              <p className={`mt-4 text-xs ${card.warn ? "font-medium text-orange-600" : "text-slate-500"}`}>
                {card.hint}
              </p>
            </Link>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent orders */}
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
            <div>
              <h2 className="font-bold">{t("rdash.recent", "Recent Orders")}</h2>
              <p className="mt-1 text-sm text-slate-500">{t("rdash.recentHint", "The last 5 orders")}</p>
            </div>
            <Link
              to="/restaurant/daybook"
              className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              {t("rdash.dailyBook", "Daily Book")} <ChevronRight size={16} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">{t("rdash.col.order", "Order")}</th>
                  <th className="px-5 py-3">{t("rdash.col.customer", "Customer")}</th>
                  <th className="px-5 py-3 text-right">{t("rdash.col.total", "Total")}</th>
                  <th className="px-5 py-3 text-right">{t("rdash.col.paid", "Paid")}</th>
                  <th className="px-5 py-3">{t("rdash.col.status", "Status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">
                      {t("rdash.noOrders", "No orders yet.")}{" "}
                      <Link to="/restaurant/counter" className="font-semibold text-emerald-600">
                        {t("rdash.firstSale", "Record your first sale")}
                      </Link>
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => {
                    const badge = statusBadge(order.status);
                    return (
                      <tr key={order.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3.5">
                          <p className="font-semibold">
                            #{order.id.slice(0, 6).toUpperCase()}
                            {order.createdAt && (
                              <span className="ml-2 text-xs font-normal text-slate-400">
                                {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 max-w-[260px] truncate text-xs text-slate-400">{order.items}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          {order.customer === "Walk-in" ? t("rdash.walkIn", "Walk-in") : order.customer}
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium">{money(order.total)}</td>
                        <td className="px-5 py-3.5 text-right">{money(order.paid)}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.cls}`}>
                            {t(badge.labelKey, badge.label)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </article>

        {/* Tables */}
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">{t("rdash.tables", "Tables")}</h2>
              <p className="mt-1 text-sm text-slate-500">{t("rdash.tablesHint", "Right now")}</p>
            </div>
            <UtensilsCrossed size={21} className="text-emerald-600" />
          </div>

          {tables.total === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
              {t("rdash.noTables", "No tables set up. Counter-only restaurants don't need them.")}{" "}
              <Link to="/restaurant/tables" className="font-semibold text-emerald-600">
                {t("rdash.addTables", "Add tables")}
              </Link>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-2xl font-bold text-emerald-700">{tables.available}</p>
                <p className="text-xs font-medium text-emerald-700">{t("rdash.available", "Available")}</p>
              </div>
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                <p className="text-2xl font-bold text-orange-700">{tables.occupied}</p>
                <p className="text-xs font-medium text-orange-700">{t("rdash.occupied", "Occupied")}</p>
              </div>
            </div>
          )}

          <Link
            to="/restaurant/tables"
            className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm"
          >
            <span className="text-slate-500">{t("rdash.manageTables", "Manage tables")}</span>
            <ChevronRight size={16} className="text-slate-400" />
          </Link>
        </article>
      </section>

      {/* Bottom figures */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
            <Users size={22} />
          </div>
          <div>
            <p className="text-sm text-slate-500">{t("rdash.namedCustomers", "Named customers today")}</p>
            <p className="mt-1 text-2xl font-bold">{summary?.customersServedToday ?? 0}</p>
          </div>
        </article>
        <article className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="rounded-xl bg-purple-100 p-3 text-purple-600">
            <ClipboardList size={22} />
          </div>
          <div>
            <p className="text-sm text-slate-500">{t("rdash.ordersTodayLabel", "Orders today")}</p>
            <p className="mt-1 text-2xl font-bold">{summary?.ordersToday ?? 0}</p>
          </div>
        </article>
      </section>
    </div>
  );
}
