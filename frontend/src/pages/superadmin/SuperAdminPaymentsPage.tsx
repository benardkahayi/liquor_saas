import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "../../api/client";
import { money } from "../../lib/money";
import { useLanguage } from "../../context/LanguageContext";
import { Pagination } from "../../components/Pagination";
import { ErrorBanner, extractErrorMessage } from "../../components/ErrorBanner";
import { methodLabel, PLAN_LABEL, type SubscriptionPayment } from "../../lib/subscriptionPayments";

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Dar_es_Salaam" });

// Every subscription payment received, newest first.
export function SuperAdminPaymentsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<SubscriptionPayment[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api
      .get("/superadmin/payments", { params: { page, pageSize: 25, search: search.trim() || undefined } })
      .then((res) => {
        setItems(res.data.items);
        setTotalAmount(res.data.totalAmount);
        setPagination(res.data.pagination);
        setError(null);
      })
      .catch((err) => setError(extractErrorMessage(err, t("superadmin.payments.error", "Failed to load payments"))))
      .finally(() => setIsLoading(false));
  }, [page, search, t]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("superadmin.payments.title", "Payments")}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("superadmin.payments.subtitle", "Money businesses paid you for their plans.")}
          </p>
        </div>
        {pagination && (
          <p className="text-sm text-gray-600">
            {pagination.total} {t("superadmin.payments.count", "payments")} ·{" "}
            <span className="font-semibold text-gray-900">{money(totalAmount)}</span>
          </p>
        )}
      </div>

      <ErrorBanner message={error} />

      <label className="relative block sm:w-80">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          aria-label={t("superadmin.payments.search", "Search by business or transaction ID")}
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="mt-1 block text-xs text-gray-500">
          {t("superadmin.payments.search", "Search by business or transaction ID")}
        </span>
      </label>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">{t("expenses.col.date", "Date")}</th>
              <th className="px-4 py-3">{t("superadmin.col.business", "Business")}</th>
              <th className="px-4 py-3">{t("superadmin.col.plan", "Plan")}</th>
              <th className="px-4 py-3 text-right">{t("expenses.col.amount", "Amount")}</th>
              <th className="px-4 py-3">{t("superadmin.pay.method", "Paid with")}</th>
              <th className="px-4 py-3">{t("superadmin.pay.reference", "Transaction ID")}</th>
              <th className="px-4 py-3">{t("superadmin.payments.until", "Paid until")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {t("common.loading", "Loading...")}
                </td>
              </tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                  {search
                    ? t("superadmin.payments.noMatch", "No payment matches that search.")
                    : t(
                        "superadmin.payments.empty",
                        "No payments yet. When a business pays, record it from Subscriptions — it will show here."
                      )}{" "}
                  {!search && (
                    <Link to="/super-admin/subscriptions" className="text-blue-600 hover:underline">
                      {t("nav.subscriptions", "Subscriptions")}
                    </Link>
                  )}
                </td>
              </tr>
            )}
            {items.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{fmtDate(p.paidAt)}</td>
                <td className="px-4 py-3">
                  <Link to={`/super-admin/tenants/${p.tenant.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                    {p.tenant.name}
                  </Link>
                  {p.note && <p className="text-xs text-gray-500">{p.note}</p>}
                </td>
                <td className="px-4 py-3 text-gray-700">{PLAN_LABEL[p.plan] ?? p.plan}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-gray-900">{money(p.amount)}</td>
                <td className="px-4 py-3 text-gray-700">{methodLabel(p.method)}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{p.reference ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{p.periodEnd ? fmtDate(p.periodEnd) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && <Pagination pagination={pagination} onPageChange={setPage} />}
    </div>
  );
}

export default SuperAdminPaymentsPage;
