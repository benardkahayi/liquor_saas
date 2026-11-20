import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Users, Building2, CreditCard } from "lucide-react";
import { api } from "../../api/client";
import { money } from "../../lib/money";
import { calculateGrowth, countInRange, formatGrowthLabel } from "../../lib/growth";
import { useLanguage } from "../../context/LanguageContext";
import {
  getMockRevenueTrend,
  getMockRecentPayments,
  getMockActivity,
  type ActivityTemplateKey,
} from "../../lib/platformMockData";
import { MiniBarChart } from "../../components/charts/MiniBarChart";
import { DistributionBars } from "../../components/charts/DistributionBars";
import { ErrorBanner, extractErrorMessage } from "../../components/ErrorBanner";

type DateRange = "7D" | "30D" | "3M" | "1Y";

const RANGE_DAYS: Record<DateRange, number> = { "7D": 7, "30D": 30, "3M": 90, "1Y": 365 };
const RANGE_BUCKETS: Record<DateRange, number> = { "7D": 7, "30D": 10, "3M": 6, "1Y": 12 };

interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  platformRevenue: number | string;
  monthlyIncomeTzs?: number;
  payingBusinesses?: number;
}

interface TenantRow {
  id: string;
  name: string;
  industry: string;
  status: "ACTIVE" | "SUSPENDED" | "TRIAL" | "CANCELLED";
  createdAt: string;
  subscription: { plan: string; status: string; currentPeriodEnd: string | null } | null;
  _count: { users: number };
  users: { fullName: string; email: string }[];
}

const ACTIVITY_TEMPLATES: Record<ActivityTemplateKey, { key: string; en: string }> = {
  registered: { key: "superadmin.activity.registered", en: "{n} registered as a new business" },
  upgraded: { key: "superadmin.activity.upgraded", en: "{n} upgraded their subscription plan" },
  paymentReceived: { key: "superadmin.activity.paymentReceived", en: "Payment received from {n}" },
  userAdded: { key: "superadmin.activity.userAdded", en: "New user added to {n}" },
  suspended: { key: "superadmin.activity.suspended", en: "{n} was suspended" },
};

export function SuperAdminDashboardPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [tenants, setTenants] = useState<TenantRow[] | null>(null);
  const [range, setRange] = useState<DateRange>("30D");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get("/superadmin/stats"),
      api.get("/superadmin/tenants", { params: { page: 1, pageSize: 100 } }),
    ])
      .then(([statsRes, tenantsRes]) => {
        setStats(statsRes.data.data);
        setTenants(tenantsRes.data.items);
      })
      .catch((err) => setError(extractErrorMessage(err, t("superadmin.dashboard.error.load", "Failed to load platform overview"))));
  }, [t]);

  const analysis = useMemo(() => {
    if (!tenants) return null;

    const now = new Date();
    const days = RANGE_DAYS[range];
    const currentStart = new Date(now.getTime() - days * 86400000);
    const previousStart = new Date(now.getTime() - days * 2 * 86400000);

    const createdDates = tenants.map((t) => new Date(t.createdAt));
    const currentSignups = countInRange(createdDates, currentStart, now);
    const previousSignups = countInRange(createdDates, previousStart, currentStart);
    const businessGrowth = calculateGrowth(currentSignups, previousSignups);

    const activeSubs = tenants.filter((t) => t.subscription?.status === "ACTIVE" && t.status === "ACTIVE");
    const trial = tenants.filter((t) => t.status === "TRIAL");
    const cancelled = tenants.filter((t) => t.status === "CANCELLED");
    const expiringSoon = tenants.filter((t) => {
      if (!t.subscription?.currentPeriodEnd) return false;
      const end = new Date(t.subscription.currentPeriodEnd);
      const daysLeft = (end.getTime() - now.getTime()) / 86400000;
      return daysLeft >= 0 && daysLeft <= 7;
    });

    // Real figure from the server: plans that are paid up, at their prices.
    const estimatedMRR = stats?.monthlyIncomeTzs ?? 0;

    const industryCounts = new Map<string, number>();
    for (const t of tenants) {
      const label = formatIndustry(t.industry);
      industryCounts.set(label, (industryCounts.get(label) ?? 0) + 1);
    }

    const recent = [...tenants]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      currentSignups,
      businessGrowth,
      activeSubsCount: activeSubs.length,
      trialCount: trial.length,
      cancelledCount: cancelled.length,
      expiringSoonCount: expiringSoon.length,
      estimatedMRR,
      industryDistribution: Array.from(industryCounts, ([label, count]) => ({ label, count })),
      recent,
    };
  }, [tenants, range, stats]);

  const revenueTrend = useMemo(() => {
    if (!analysis) return [];
    return getMockRevenueTrend(analysis.estimatedMRR, RANGE_BUCKETS[range]);
  }, [analysis, range]);

  const mockPayments = useMemo(
    () => getMockRecentPayments(tenants?.map((t) => t.name) ?? []),
    [tenants]
  );
  const mockActivity = useMemo(
    () => getMockActivity(tenants?.map((t) => t.name) ?? []),
    [tenants]
  );

  const rangeLabels: Record<DateRange, string> = {
    "7D": t("superadmin.range.7d", "7D"),
    "30D": t("superadmin.range.30d", "30D"),
    "3M": t("superadmin.range.3m", "3M"),
    "1Y": t("superadmin.range.1y", "1Y"),
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("superadmin.dashboard.title", "Platform Overview")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t("superadmin.dashboard.subtitle", "Monitor businesses, subscriptions and platform performance.")}
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 self-start">
          {(["7D", "30D", "3M", "1Y"] as DateRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                range === r ? "bg-white text-gray-900 shadow-sm font-medium" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {rangeLabels[r]}
            </button>
          ))}
        </div>
      </div>

      <ErrorBanner message={error} />

      {stats && analysis && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
              icon={Building2}
              label={t("superadmin.kpi.totalBusinesses", "Total Businesses")}
              value={stats.totalTenants.toString()}
              growth={analysis.businessGrowth}
              context={`${t("superadmin.kpi.vsPrevious", "vs previous")} ${rangeLabels[range]}`}
            />
            <KpiCard
              icon={CreditCard}
              label={t("superadmin.kpi.activeSubscriptions", "Active Subscriptions")}
              value={analysis.activeSubsCount.toString()}
              context={t("superadmin.kpi.currentlyActive", "currently active")}
            />
            <KpiCard
              icon={TrendingUp}
              label={t("superadmin.kpi.mrr", "Monthly Recurring Revenue")}
              value={money(analysis.estimatedMRR)}
              context={t("superadmin.estimated", "estimated — billing integration pending")}
            />
            <KpiCard
              icon={Users}
              label={t("nav.users", "Total Users")}
              value={stats.totalUsers.toString()}
              context={t("superadmin.kpi.acrossBusinesses", "across all businesses")}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 card p-5">
              <div className="flex items-baseline justify-between mb-1">
                <h2 className="font-semibold text-gray-900">{t("superadmin.revenueOverview", "Revenue Overview")}</h2>
                <span className="text-xs text-gray-400">{t("superadmin.estimated", "Estimated — billing integration pending")}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-4">{money(analysis.estimatedMRR)}</p>
              <MiniBarChart points={revenueTrend} />
            </div>

            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">{t("superadmin.businessDistribution", "Business Distribution")}</h2>
              <DistributionBars data={analysis.industryDistribution} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">{t("superadmin.recentBusinesses", "Recent Businesses")}</h2>
                <Link to="/super-admin/tenants" className="text-sm text-blue-600 hover:underline">
                  {t("superadmin.viewAll", "View All")}
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-left uppercase text-xs tracking-wide">
                    <tr>
                      <th className="px-5 py-2 font-medium">{t("superadmin.col.business", "Business")}</th>
                      <th className="px-5 py-2 font-medium">{t("superadmin.col.owner", "Owner")}</th>
                      <th className="px-5 py-2 font-medium">{t("superadmin.col.type", "Type")}</th>
                      <th className="px-5 py-2 font-medium">{t("superadmin.col.plan", "Plan")}</th>
                      <th className="px-5 py-2 font-medium">{t("settings.status", "Status")}</th>
                      <th className="px-5 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.recent.map((t2) => (
                      <tr key={t2.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-2.5 text-gray-900 font-medium whitespace-nowrap">{t2.name}</td>
                        <td className="px-5 py-2.5 text-gray-600 whitespace-nowrap">
                          {t2.users[0]?.fullName ?? "—"}
                        </td>
                        <td className="px-5 py-2.5 text-gray-600 whitespace-nowrap">{formatIndustry(t2.industry)}</td>
                        <td className="px-5 py-2.5 text-gray-600">{t2.subscription?.plan ?? "—"}</td>
                        <td className="px-5 py-2.5">
                          <TenantStatusBadge status={t2.status} />
                        </td>
                        <td className="px-5 py-2.5 text-right whitespace-nowrap">
                          <Link
                            to={`/super-admin/tenants/${t2.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {t("superadmin.tenants.view", "View")}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">{t("nav.subscriptions", "Subscriptions")}</h2>
                <Link to="/super-admin/tenants" className="text-sm text-blue-600 hover:underline">
                  {t("superadmin.viewAll", "View All")}
                </Link>
              </div>
              <div className="space-y-3 text-sm">
                <SummaryRow label={t("superadmin.tenants.status.active", "Active")} value={analysis.activeSubsCount} color="bg-green-500" />
                <SummaryRow label={t("superadmin.tenants.status.trial", "Trial")} value={analysis.trialCount} color="bg-blue-500" />
                <SummaryRow label={t("superadmin.expiringSoon", "Expiring Soon")} value={analysis.expiringSoonCount} color="bg-amber-500" />
                <SummaryRow label={t("superadmin.tenants.status.cancelled", "Cancelled")} value={analysis.cancelledCount} color="bg-gray-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">{t("superadmin.recentPayments", "Recent Payments")}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{t("superadmin.estimated", "Estimated — billing integration pending")}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-left uppercase text-xs tracking-wide">
                    <tr>
                      <th className="px-5 py-2 font-medium">{t("superadmin.col.business", "Business")}</th>
                      <th className="px-5 py-2 font-medium">{t("superadmin.col.plan", "Plan")}</th>
                      <th className="px-5 py-2 font-medium">{t("expenses.col.amount", "Amount")}</th>
                      <th className="px-5 py-2 font-medium">{t("settings.status", "Status")}</th>
                      <th className="px-5 py-2 font-medium">{t("expenses.col.date", "Date")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockPayments.map((p) => (
                      <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-2.5 text-gray-900 font-medium whitespace-nowrap">{p.businessName}</td>
                        <td className="px-5 py-2.5 text-gray-600">{p.plan}</td>
                        <td className="px-5 py-2.5 text-gray-600">{money(p.amount)}</td>
                        <td className="px-5 py-2.5">
                          <PaymentStatusBadge status={p.status} />
                        </td>
                        <td className="px-5 py-2.5 text-gray-500 whitespace-nowrap">
                          {new Date(p.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">{t("superadmin.platformActivity", "Platform Activity")}</h2>
              <div className="space-y-4">
                {mockActivity.map((a) => {
                  const template = ACTIVITY_TEMPLATES[a.templateKey];
                  const message = t(template.key, template.en).replace("{n}", a.businessName);
                  return (
                    <div key={a.id} className="text-sm">
                      <p className="text-gray-700">{message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{timeAgo(a.timestamp, t)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatIndustry(industry: string): string {
  return industry
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function timeAgo(iso: string, t: (key: string, fallback: string) => string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return t("superadmin.time.justNow", "Just now");
  if (hours < 24) return `${hours}${t("superadmin.time.hoursAgo", "h ago")}`;
  return `${Math.floor(hours / 24)}${t("superadmin.time.daysAgo", "d ago")}`;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  growth,
  context,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  growth?: { percent: number | null; isNew: boolean };
  context: string;
}) {
  const { t } = useLanguage();
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
        <span className="bg-blue-50 text-blue-600 rounded-lg p-1.5">
          <Icon size={16} />
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {growth && (
          <span
            className={`text-xs font-medium ${
              growth.percent === null
                ? "text-blue-600"
                : growth.percent >= 0
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {formatGrowthLabel(growth, t("superadmin.kpi.new", "New"))}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-1">{context}</p>
    </div>
  );
}

function SummaryRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-gray-700">{label}</span>
      </div>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function TenantStatusBadge({ status }: { status: TenantRow["status"] }) {
  const { t } = useLanguage();
  const colors: Record<TenantRow["status"], string> = {
    ACTIVE: "bg-green-100 text-green-700",
    TRIAL: "bg-blue-100 text-blue-700",
    SUSPENDED: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-500",
  };
  const labels: Record<TenantRow["status"], string> = {
    ACTIVE: t("superadmin.tenants.status.active", "ACTIVE"),
    TRIAL: t("superadmin.tenants.status.trial", "TRIAL"),
    SUSPENDED: t("superadmin.tenants.status.suspended", "SUSPENDED"),
    CANCELLED: t("superadmin.tenants.status.cancelled", "CANCELLED"),
  };
  return <span className={`badge ${colors[status]}`}>{labels[status]}</span>;
}

function PaymentStatusBadge({ status }: { status: "PAID" | "PENDING" | "FAILED" | "REFUNDED" }) {
  const { t } = useLanguage();
  const colors: Record<string, string> = {
    PAID: "bg-green-100 text-green-700",
    PENDING: "bg-amber-100 text-amber-700",
    FAILED: "bg-red-100 text-red-700",
    REFUNDED: "bg-gray-100 text-gray-500",
  };
  const labels: Record<string, string> = {
    PAID: t("superadmin.payment.paid", "PAID"),
    PENDING: t("superadmin.payment.pending", "PENDING"),
    FAILED: t("superadmin.payment.failed", "FAILED"),
    REFUNDED: t("superadmin.payment.refunded", "REFUNDED"),
  };
  return <span className={`badge ${colors[status]}`}>{labels[status]}</span>;
}
