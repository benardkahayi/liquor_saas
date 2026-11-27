import { useEffect, useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { api } from "../api/client";
import { downloadBlob } from "../lib/csv";
import { money } from "../lib/money";
import { useLanguage } from "../context/LanguageContext";
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
  const { t } = useLanguage();
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
        setError(extractErrorMessage(firstError.reason, t("reports.error.load", "Some reports failed to load")));
      } else {
        setError(null);
      }
    });
  }

  useEffect(load, [startDate, endDate]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("reports.title", "Reports")}</h1>

      <ErrorBanner message={error} />

      <PdfReportCard />

      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t("reports.startDate", "Start Date")}</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t("reports.endDate", "End Date")}</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-3">{t("reports.sales", "Sales")}</h2>
          {salesReport ? (
            <div className="space-y-1 text-sm">
              <Row label={t("reports.totalRevenue", "Total Revenue")} value={money(salesReport.totalRevenue)} />
              <Row label={t("reports.totalDiscount", "Total Discount")} value={money(salesReport.totalDiscount)} />
              <Row label={t("reports.numberOfSales", "Number of Sales")} value={String(salesReport.saleCount)} />
            </div>
          ) : (
            <p className="text-gray-400 text-sm">{t("reports.noData", "No data.")}</p>
          )}
        </section>

        <section className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-3">{t("reports.inventoryValuation", "Inventory Valuation")}</h2>
          {valuation ? (
            <div className="space-y-1 text-sm">
              <Row label={t("reports.costValue", "Cost Value")} value={money(valuation.costValue)} />
              <Row label={t("reports.retailValue", "Retail Value")} value={money(valuation.retailValue)} />
              <Row label={t("reports.potentialProfit", "Potential Profit")} value={money(valuation.potentialProfit)} />
            </div>
          ) : (
            <p className="text-gray-400 text-sm">{t("reports.noData", "No data.")}</p>
          )}
        </section>

        <section className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-3">{t("dashboard.lowStock", "Low Stock")}</h2>
          {lowStock.length === 0 && <p className="text-gray-400 text-sm">{t("reports.noLowStock", "No low-stock items.")}</p>}
          <div className="space-y-1 text-sm">
            {lowStock.map((item) => (
              <Row
                key={item.id}
                label={item.name}
                value={`${item.stockQuantity} / ${t("products.min", "min")} ${item.minStockLevel}`}
              />
            ))}
          </div>
        </section>

        <section className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-3">{t("reports.expensesByCategory", "Expenses by Category")}</h2>
          {expensesByCategory.length === 0 && (
            <p className="text-gray-400 text-sm">{t("reports.noExpenses", "No expenses in range.")}</p>
          )}
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

type Period = "week" | "month";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dmy = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

const MONTHS = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  sw: ["Januari", "Februari", "Machi", "Aprili", "Mei", "Juni", "Julai", "Agosti", "Septemba", "Oktoba", "Novemba", "Desemba"],
};

function PdfReportCard() {
  const { t, language } = useLanguage();
  const [period, setPeriod] = useState<Period>("week");
  const [choice, setChoice] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The last 12 weeks (Monday to Sunday) or the last 12 months.
  const options = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    if (period === "week") {
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      return Array.from({ length: 12 }, (_, i) => {
        const start = new Date(monday);
        start.setDate(monday.getDate() - 7 * i);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const prefix =
          i === 0 ? t("reports.pdf.thisWeek", "This week") : i === 1 ? t("reports.pdf.lastWeek", "Last week") : null;
        return { date: iso(start), label: `${prefix ? prefix + ": " : ""}${dmy(start)} - ${dmy(end)}` };
      });
    }
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1, 12);
      return { date: iso(d), label: `${MONTHS[language][d.getMonth()]} ${d.getFullYear()}` };
    });
  }, [period, language, t]);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const opt = options[choice] ?? options[0];
      const res = await api.get("/reports/sales-pdf", {
        params: { period, date: opt.date, lang: language },
        responseType: "blob",
      });
      const disposition = String(res.headers["content-disposition"] ?? "");
      const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `sales-${period}-${opt.date}.pdf`;
      downloadBlob(res.data as Blob, name);
    } catch (err) {
      setError(extractErrorMessage(err, t("reports.pdf.error", "Could not create the PDF report")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-4 mb-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h2 className="font-semibold text-gray-900">{t("reports.pdf.title", "Sales report (PDF)")}</h2>
          <p className="text-sm text-gray-500">
            {t("reports.pdf.subtitle", "Totals, sales per day, top products, payments, expenses and profit.")}
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          {(["week", "month"] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPeriod(p);
                setChoice(0);
              }}
              className={`px-3 py-2 text-sm ${period === p ? "bg-amber-500 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
            >
              {p === "week" ? t("reports.pdf.week", "Weekly") : t("reports.pdf.month", "Monthly")}
            </button>
          ))}
        </div>
        <select value={choice} onChange={(e) => setChoice(Number(e.target.value))} className="input w-auto min-w-[220px]">
          {options.map((o, i) => (
            <option key={o.date} value={i}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={download}
          disabled={busy}
          className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-50"
        >
          <FileDown size={16} /> {busy ? t("reports.pdf.preparing", "Preparing...") : t("reports.pdf.download", "Download PDF")}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </section>
  );
}
