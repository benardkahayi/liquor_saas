import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "../../api/client";
import { money } from "../../lib/money";
import { useLanguage } from "../../context/LanguageContext";
import { ErrorBanner, extractErrorMessage } from "../../components/ErrorBanner";
import { RecordPaymentModal } from "../../components/RecordPaymentModal";

type PlanName = "FREE" | "STARTER" | "PRO";
type Due = "free" | "paid" | "expiring" | "expired";

interface Row {
  tenantId: string;
  name: string;
  industry: string | null;
  tenantStatus: string;
  owner: { fullName: string; email: string } | null;
  users: number;
  plan: PlanName;
  planLabel: string;
  priceTzs: number | null;
  planPrices: { STARTER: number | null; PRO: number | null };
  paidUntil: string | null;
  due: Due;
  salesThisMonth: number;
  createdAt: string;
}

interface Summary {
  businesses: number;
  byPlan: Record<PlanName, number>;
  payingNow: number;
  monthlyIncomeTzs: number;
  expiringSoon: number;
  expired: number;
}

type Filter = "all" | PlanName | "expiring" | "expired";

const PLAN_STYLE: Record<PlanName, string> = {
  FREE: "bg-gray-100 text-gray-700",
  STARTER: "bg-emerald-100 text-emerald-800",
  PRO: "bg-purple-100 text-purple-800",
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function industryLabel(v: string | null) {
  if (!v) return "—";
  return v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function SuperAdminSubscriptionsPage() {
  const { t } = useLanguage();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [paying, setPaying] = useState<{ row: Row; plan: Exclude<PlanName, "FREE"> } | null>(null);

  function load() {
    setIsLoading(true);
    const params: Record<string, string> = {};
    if (filter === "FREE" || filter === "STARTER" || filter === "PRO") params.plan = filter;
    if (filter === "expiring" || filter === "expired") params.due = filter;
    if (search.trim()) params.search = search.trim();
    api
      .get<{ data: { summary: Summary; items: Row[] } }>("/superadmin/subscriptions", { params })
      .then((res) => {
        setSummary(res.data.data.summary);
        setRows(res.data.data.items);
        setError(null);
      })
      .catch((err) => setError(extractErrorMessage(err, t("superadmin.subs.error", "Failed to load subscriptions"))))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [filter, search]);

  // Paid plans open the payment form; moving to Free just needs a yes.
  async function changePlan(row: Row, plan: PlanName) {
    if (plan !== "FREE") {
      setPaying({ row, plan });
      return;
    }
    if (!confirm(`Move "${row.name}" to the Free plan? Their paid time ends now.`)) return;
    setBusyId(row.tenantId);
    try {
      await api.put(`/superadmin/tenants/${row.tenantId}/plan`, { plan });
      load();
    } catch (err) {
      setError(extractErrorMessage(err, t("superadmin.subs.error.change", "Could not change the plan")));
    } finally {
      setBusyId(null);
    }
  }

  const filters: { key: Filter; label: string; count?: number }[] = [
    { key: "all", label: t("superadmin.subs.all", "All"), count: summary?.businesses },
    { key: "FREE", label: "Free", count: summary?.byPlan.FREE },
    { key: "STARTER", label: "Starter", count: summary?.byPlan.STARTER },
    { key: "PRO", label: "Pro", count: summary?.byPlan.PRO },
    { key: "expiring", label: t("superadmin.subs.expiring", "Ending in 7 days"), count: summary?.expiringSoon },
    { key: "expired", label: t("superadmin.subs.expired", "Payment overdue"), count: summary?.expired },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("superadmin.subs.title", "Subscriptions")}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t("superadmin.subs.subtitle", "Every business, its plan, and when its payment runs out.")}
        </p>
      </div>

      <ErrorBanner message={error} />

      {summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={t("superadmin.subs.expected", "Expected each month")} value={money(summary.monthlyIncomeTzs)} note={t("superadmin.subs.incomeNote", "From plans that are paid up")} />
          <Stat label={t("superadmin.subs.paying", "Paying businesses")} value={String(summary.payingNow)} note={`${summary.businesses} ${t("superadmin.subs.total", "in total")}`} />
          <Stat label={t("superadmin.subs.expiring", "Ending in 7 days")} value={String(summary.expiringSoon)} note={t("superadmin.subs.expiringNote", "Remind them to pay")} tone={summary.expiringSoon ? "amber" : undefined} />
          <Stat label={t("superadmin.subs.expired", "Payment overdue")} value={String(summary.expired)} note={t("superadmin.subs.expiredNote", "Paid plan, date passed")} tone={summary.expired ? "red" : undefined} />
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                filter === f.key ? "bg-gray-900 text-white" : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
              }`}
            >
              {f.label}
              {f.count !== undefined && <span className="ml-1.5 opacity-60">{f.count}</span>}
            </button>
          ))}
        </div>
        <label className="relative block lg:w-72">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("superadmin.subs.search", "Business name or owner email")}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">{t("superadmin.subs.business", "Business")}</th>
              <th className="px-4 py-3">{t("superadmin.subs.plan", "Plan")}</th>
              <th className="px-4 py-3">{t("superadmin.subs.price", "Price / month")}</th>
              <th className="px-4 py-3">{t("superadmin.subs.paidUntil", "Paid until")}</th>
              <th className="px-4 py-3 text-right">{t("superadmin.subs.staff", "Staff")}</th>
              <th className="px-4 py-3 text-right">{t("superadmin.subs.sales", "Sales this month")}</th>
              <th className="px-4 py-3">{t("superadmin.subs.change", "Change plan")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{t("common.loading", "Loading...")}</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{t("superadmin.subs.none", "No businesses match.")}</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.tenantId} className="align-top hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link to={`/super-admin/tenants/${r.tenantId}`} className="font-semibold text-gray-900 hover:text-blue-600">
                    {r.name}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {industryLabel(r.industry)}
                    {r.tenantStatus !== "ACTIVE" && <span className="ml-1.5 font-semibold text-red-600">· {r.tenantStatus.toLowerCase()}</span>}
                  </p>
                  {r.owner && <p className="mt-0.5 text-xs text-gray-400">{r.owner.email}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLAN_STYLE[r.plan]}`}>{r.planLabel}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-900">
                  {r.priceTzs === null ? <span className="text-gray-400">{t("superadmin.subs.pilot", "Pilot (free)")}</span> : r.priceTzs === 0 ? "—" : money(r.priceTzs)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {r.due === "free" ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    <>
                      <span className={r.due === "expired" ? "font-semibold text-red-600" : r.due === "expiring" ? "font-semibold text-amber-700" : "text-gray-900"}>
                        {r.paidUntil ? fmtDate(r.paidUntil) : "—"}
                      </span>
                      {r.due === "expired" && <p className="text-xs text-red-600">{t("superadmin.subs.overdue", "Overdue")}</p>}
                      {r.due === "expiring" && <p className="text-xs text-amber-700">{t("superadmin.subs.soon", "Ends soon")}</p>}
                    </>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{r.users}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.salesThisMonth.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={r.plan}
                      disabled={busyId === r.tenantId}
                      onChange={(e) => changePlan(r, e.target.value as PlanName)}
                      className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
                      aria-label={`Plan for ${r.name}`}
                    >
                      <option value="FREE">Free</option>
                      <option value="STARTER">Starter</option>
                      <option value="PRO">Pro</option>
                    </select>
                    {r.plan !== "FREE" && (
                      <button
                        type="button"
                        disabled={busyId === r.tenantId}
                        onClick={() => changePlan(r, r.plan)}
                        className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {t("superadmin.subs.renewPay", "Record renewal")}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">
        {t(
          "superadmin.subs.howToPay",
          "When a business pays you, choose its plan (or Record renewal) and enter the amount and transaction ID. Paying early adds 30 days on top of the time left."
        )}{" "}
        <Link to="/super-admin/payments" className="text-blue-600 hover:underline">
          {t("superadmin.subs.seePayments", "See all payments")}
        </Link>
      </p>

      {paying && (
        <RecordPaymentModal
          tenantId={paying.row.tenantId}
          businessName={paying.row.name}
          currentPlan={paying.row.plan}
          plan={paying.plan}
          priceTzs={paying.row.planPrices[paying.plan]}
          onClose={() => setPaying(null)}
          onSaved={() => {
            setPaying(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: string; note: string; tone?: "amber" | "red" }) {
  const color = tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-700" : "text-gray-900";
  return (
    <div className="card p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-400">{note}</p>
    </div>
  );
}

export default SuperAdminSubscriptionsPage;
