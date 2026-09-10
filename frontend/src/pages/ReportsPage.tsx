import { useEffect, useState } from "react";
import { api } from "../api/client";
import { money } from "../lib/money";
import { ErrorBanner, extractErrorMessage } from "../components/ErrorBanner";

interface LowStockItem {
  id: string;
  name: string;
  stockQuantity: number;
  minStockLevel: number;
}

interface InventoryValuation {
  costValue: number;
  retailValue: number;
  potentialProfit: number;
}

interface SalesReport {
  totalRevenue: number | string;
  totalDiscount: number | string;
  saleCount: number;
  byDay: { date: string; total: string; count: string }[];
}

interface ExpenseByCategory {
  category: string;
  _sum: { amount: string | number | null };
}

export function ReportsPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [valuation, setValuation] = useState<InventoryValuation | null>(null);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpenseByCategory[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    const params = {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };

    Promise.allSettled([
      api.get("/reports/low-stock"),
      api.get("/reports/inventory-valuation"),
      api.get("/reports/sales", { params }),
      api.get("/reports/expenses-by-category", { params }),
    ]).then(([lowStockRes, valuationRes, salesRes, expensesRes]) => {
      if (lowStockRes.status === "fulfilled") setLowStock(lowStockRes.value.data.data ?? []);
      if (valuationRes.status === "fulfilled") setValuation(valuationRes.value.data.data);
      if (salesRes.status === "fulfilled") setSalesReport(salesRes.value.data.data);
      if (expensesRes.status === "fulfilled") setExpensesByCategory(expensesRes.value.data.data ?? []);

      const firstError = [lowStockRes, valuationRes, salesRes, expensesRes].find(
        (r) => r.status === "rejected"
      );
      if (firstError && firstError.status === "rejected") {
        setError(extractErrorMessage(firstError.reason, "Some reports failed to load"));
      } else {
        setError(null);
      }
    });
  }

  useEffect(load, [startDate, endDate]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports</h1>

      <ErrorBanner message={error} />

      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <section className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Sales</h2>
          {salesReport ? (
            <div className="space-y-1 text-sm">
              <Row label="Total Revenue" value={money(salesReport.totalRevenue)} />
              <Row label="Total Discount" value={money(salesReport.totalDiscount)} />
              <Row label="Number of Sales" value={String(salesReport.saleCount)} />
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data.</p>
          )}
        </section>

        <section className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Inventory Valuation</h2>
          {valuation ? (
            <div className="space-y-1 text-sm">
              <Row label="Cost Value" value={money(valuation.costValue)} />
              <Row label="Retail Value" value={money(valuation.retailValue)} />
              <Row label="Potential Profit" value={money(valuation.potentialProfit)} />
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data.</p>
          )}
        </section>

        <section className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Low Stock</h2>
          {lowStock.length === 0 && <p className="text-gray-400 text-sm">No low-stock items.</p>}
          <div className="space-y-1 text-sm">
            {lowStock.map((item) => (
              <Row
                key={item.id}
                label={item.name}
                value={`${item.stockQuantity} / min ${item.minStockLevel}`}
              />
            ))}
          </div>
        </section>

        <section className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Expenses by Category</h2>
          {expensesByCategory.length === 0 && <p className="text-gray-400 text-sm">No expenses in range.</p>}
          <div className="space-y-1 text-sm">
            {expensesByCategory.map((row) => (
              <Row key={row.category} label={row.category} value={money(row._sum.amount ?? 0)} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-gray-600">
      <span>{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}
