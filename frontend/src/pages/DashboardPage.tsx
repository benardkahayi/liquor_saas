import { useEffect, useState } from "react";
import { api } from "../api/client";
import { money } from "../lib/money";
import { useLanguage } from "../context/LanguageContext";
import { ErrorBanner, extractErrorMessage } from "../components/ErrorBanner";

interface Summary {
  todaySales: number;
  todaySalesCount: number;
  todayProfit: number;
  totalProducts: number;
  lowStockCount: number;
  totalCustomers: number;
  todayExpenses: number;
}

export function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    api
      .get<{ data: Summary }>("/dashboard/summary")
      .then((res) => setSummary(res.data.data))
      .catch((err) => setError(extractErrorMessage(err, t("dashboard.error", "Failed to load dashboard"))));
  }, [t]);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("dashboard.title", "Dashboard")}</h1>

      <ErrorBanner message={error} />

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label={t("dashboard.todaySales", "Today's Sales")} value={money(summary.todaySales)} />
          <StatCard label={t("dashboard.todayProfit", "Today's Profit")} value={money(summary.todayProfit)} />
          <StatCard label={t("dashboard.totalProducts", "Total Products")} value={summary.totalProducts} />
          <StatCard label={t("dashboard.lowStock", "Low Stock")} value={summary.lowStockCount} />
          <StatCard label={t("dashboard.totalCustomers", "Total Customers")} value={summary.totalCustomers} />
          <StatCard label={t("dashboard.todayExpenses", "Today's Expenses")} value={money(summary.todayExpenses)} />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
