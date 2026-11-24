import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { useLanguage } from "../../context/LanguageContext";
import { Pagination } from "../../components/Pagination";
import { ErrorBanner, extractErrorMessage } from "../../components/ErrorBanner";

type TenantStatus = "ACTIVE" | "SUSPENDED" | "TRIAL" | "CANCELLED";

type ActivityLevel = "active" | "trying" | "quiet" | "new" | "signed_up_only";

interface TenantActivity {
  level: ActivityLevel;
  salesLast7Days: number;
  daysWithSalesLast7: number;
  lastSaleAt: string | null;
  lastActiveAt: string | null;
  products: number;
}

interface Tenant {
  id: string;
  name: string;
  status: TenantStatus;
  createdAt: string;
  _count: { users: number; products?: number };
  settings?: { phone: string | null } | null;
  users?: { fullName: string; email: string }[];
  activity?: TenantActivity;
}

// +255712345678 -> 0712 345 678
function displayPhone(p: string): string {
  return /^\+255\d{9}$/.test(p) ? `0${p.slice(4, 7)} ${p.slice(7, 10)} ${p.slice(10)}` : p;
}

function ago(iso: string | null, t: (key: string, fallback: string) => string): string {
  if (!iso) return t("superadmin.activity.never", "Never");
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return t("superadmin.time.justNow", "Just now");
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}${t("superadmin.time.hoursAgo", "h ago")}`;
  return `${Math.floor(hours / 24)}${t("superadmin.time.daysAgo", "d ago")}`;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function SuperAdminTenantsPage() {
  const { t } = useLanguage();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TenantStatus | "">("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function load() {
    setIsLoading(true);
    api
      .get("/superadmin/tenants", {
        params: { page, pageSize: 20, search: search || undefined, status: status || undefined },
      })
      .then((res) => {
        setTenants(res.data.items);
        setPagination(res.data.pagination);
        setError(null);
      })
      .catch((err) => setError(extractErrorMessage(err, t("superadmin.tenants.error.load", "Failed to load tenants"))))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [page, search, status]);

  async function toggleStatus(tenant: Tenant) {
    const nextStatus: TenantStatus = tenant.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    const actionLabel =
      nextStatus === "SUSPENDED"
        ? t("superadmin.tenants.suspend", "Suspend")
        : t("superadmin.tenants.activate", "Activate");
    if (!confirm(`${actionLabel} "${tenant.name}"?`)) return;

    try {
      await api.put(`/superadmin/tenants/${tenant.id}/status`, { status: nextStatus });
      load();
    } catch (err) {
      setError(extractErrorMessage(err, t("superadmin.tenants.error.status", "Failed to update tenant status")));
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("nav.businesses", "Businesses")}</h1>

      <ErrorBanner message={error} />

      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder={t("superadmin.tenants.search", "Search tenants...")}
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="input flex-1"
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as TenantStatus | "");
          }}
          className="input w-48"
        >
          <option value="">{t("superadmin.tenants.allStatuses", "All statuses")}</option>
          <option value="ACTIVE">{t("superadmin.tenants.status.active", "Active")}</option>
          <option value="TRIAL">{t("superadmin.tenants.status.trial", "Trial")}</option>
          <option value="SUSPENDED">{t("superadmin.tenants.status.suspended", "Suspended")}</option>
          <option value="CANCELLED">{t("superadmin.tenants.status.cancelled", "Cancelled")}</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-2 font-medium">{t("customers.col.name", "Name")}</th>
              <th className="px-4 py-2 font-medium">{t("superadmin.activity.col", "Activity")}</th>
              <th className="px-4 py-2 font-medium text-right">{t("superadmin.activity.sales7", "Sales, 7 days")}</th>
              <th className="px-4 py-2 font-medium text-right">{t("nav.products", "Products")}</th>
              <th className="px-4 py-2 font-medium">{t("superadmin.activity.lastActive", "Last active")}</th>
              <th className="px-4 py-2 font-medium">{t("settings.status", "Status")}</th>
              <th className="px-4 py-2 font-medium">{t("superadmin.tenants.created", "Created")}</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                  {t("common.loading", "Loading...")}
                </td>
              </tr>
            )}
            {!isLoading && tenants.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                  {t("superadmin.tenants.empty", "No tenants found.")}
                </td>
              </tr>
            )}
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2 text-gray-900">
                  <Link to={`/super-admin/tenants/${tenant.id}`} className="hover:underline text-blue-600 font-medium">
                    {tenant.name}
                  </Link>
                  <div className="text-xs text-gray-500">
                    {tenant.users?.[0]?.fullName ?? "—"}
                    {tenant.settings?.phone && (
                      <>
                        {" · "}
                        <a
                          href={`https://wa.me/${tenant.settings.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="whitespace-nowrap text-green-700 hover:underline"
                          title={t("superadmin.activity.whatsapp", "WhatsApp the owner")}
                        >
                          {displayPhone(tenant.settings.phone)}
                        </a>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2">{tenant.activity && <ActivityBadge level={tenant.activity.level} />}</td>
                <td className="px-4 py-2 text-right tabular-nums text-gray-700">{tenant.activity?.salesLast7Days ?? 0}</td>
                <td className="px-4 py-2 text-right tabular-nums text-gray-700">{tenant.activity?.products ?? tenant._count.products ?? 0}</td>
                <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{ago(tenant.activity?.lastActiveAt ?? null, t)}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={tenant.status} />
                </td>
                <td className="px-4 py-2 text-gray-600">{new Date(tenant.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => toggleStatus(tenant)} className="text-blue-600 hover:underline">
                    {tenant.status === "SUSPENDED"
                      ? t("superadmin.tenants.activate", "Activate")
                      : t("superadmin.tenants.suspend", "Suspend")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs text-gray-500 sm:grid-cols-2">
        <div><ActivityBadge level="active" /> {t("superadmin.activity.help.active", "sold on 3 or more of the last 7 days")}</div>
        <div><ActivityBadge level="trying" /> {t("superadmin.activity.help.trying", "added products or some sales, not regular yet")}</div>
        <div><ActivityBadge level="new" /> {t("superadmin.activity.help.new", "registered in the last 2 days")}</div>
        <div><ActivityBadge level="signed_up_only" /> {t("superadmin.activity.help.signed", "no products or sales after 2 days: call them")}</div>
        <div><ActivityBadge level="quiet" /> {t("superadmin.activity.help.quiet", "used to sell, nothing in 7 days: follow up")}</div>
      </dl>

      {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
    </div>
  );
}

function StatusBadge({ status }: { status: TenantStatus }) {
  const { t } = useLanguage();
  const colors: Record<TenantStatus, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    TRIAL: "bg-blue-100 text-blue-700",
    SUSPENDED: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-500",
  };
  const labels: Record<TenantStatus, string> = {
    ACTIVE: t("superadmin.tenants.status.active", "ACTIVE"),
    TRIAL: t("superadmin.tenants.status.trial", "TRIAL"),
    SUSPENDED: t("superadmin.tenants.status.suspended", "SUSPENDED"),
    CANCELLED: t("superadmin.tenants.status.cancelled", "CANCELLED"),
  };
  return <span className={`badge ${colors[status]}`}>{labels[status]}</span>;
}

function ActivityBadge({ level }: { level: ActivityLevel }) {
  const { t } = useLanguage();
  const styles: Record<ActivityLevel, string> = {
    active: "bg-green-100 text-green-700",
    trying: "bg-amber-100 text-amber-800",
    new: "bg-blue-100 text-blue-700",
    signed_up_only: "bg-gray-100 text-gray-600",
    quiet: "bg-red-100 text-red-700",
  };
  const labels: Record<ActivityLevel, string> = {
    active: t("superadmin.activity.active", "Active"),
    trying: t("superadmin.activity.trying", "Trying"),
    new: t("superadmin.activity.new", "New"),
    signed_up_only: t("superadmin.activity.signedUp", "Signed up only"),
    quiet: t("superadmin.activity.quiet", "Gone quiet"),
  };
  return <span className={`badge whitespace-nowrap ${styles[level]}`}>{labels[level]}</span>;
}
