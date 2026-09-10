import { useEffect, useState } from "react";
import { api } from "../api/client";
import { money } from "../lib/money";
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

  useEffect(() => {
    api
      .get<{ data: Summary }>("/dashboard/summary")
      .then((res) => setSummary(res.data.data))
      .catch((err) => setError(extractErrorMessage(err, "Failed to load dashboard")));
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <ErrorBanner message={error} />

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Today's Sales" value={money(summary.todaySales)} />
          <StatCard label="Today's Profit" value={money(summary.todayProfit)} />
          <StatCard label="Total Products" value={summary.totalProducts} />
          <StatCard label="Low Stock" value={summary.lowStockCount} />
          <StatCard label="Total Customers" value={summary.totalCustomers} />
          <StatCard label="Today's Expenses" value={money(summary.todayExpenses)} />
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
