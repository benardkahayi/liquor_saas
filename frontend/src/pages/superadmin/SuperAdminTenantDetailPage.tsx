import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../api/client";
import { useLanguage } from "../../context/LanguageContext";
import { ErrorBanner, extractErrorMessage } from "../../components/ErrorBanner";

type TenantStatus = "ACTIVE" | "SUSPENDED" | "TRIAL" | "CANCELLED";

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  createdAt: string;
  settings: { phone: string | null; address: string | null; currency: string | null } | null;
  subscription: { plan?: string; status?: string } | null;
  _count: { users: number; products: number; sales: number };
}

export function SuperAdminTenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api
      .get(`/superadmin/tenants/${id}`)
      .then((res) => setTenant(res.data.data))
      .catch((err) => setError(extractErrorMessage(err, t("superadmin.tenantDetail.error.load", "Failed to load tenant"))));
  }

  useEffect(load, [id]);

  async function toggleStatus() {
    if (!tenant) return;
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
    <div className="max-w-2xl">
      <Link to="/super-admin/tenants" className="text-sm text-blue-600 hover:underline">
        &larr; {t("superadmin.tenantDetail.back", "Back to Businesses")}
      </Link>

      <ErrorBanner message={error} />

      {tenant && (
        <div className="card p-6 mt-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
              <p className="text-sm text-gray-500">{tenant.slug}</p>
            </div>
            <button onClick={toggleStatus} className="btn-primary px-4 py-2 text-sm">
              {tenant.status === "SUSPENDED"
                ? t("superadmin.tenants.activate", "Activate")
                : t("superadmin.tenants.suspend", "Suspend")}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <Row label={t("settings.status", "Status")} value={tenant.status} />
            <Row label={t("superadmin.tenants.created", "Created")} value={new Date(tenant.createdAt).toLocaleDateString()} />
            <Row label={t("nav.users", "Users")} value={String(tenant._count.users)} />
            <Row label={t("nav.products", "Products")} value={String(tenant._count.products)} />
            <Row label={t("nav.sales", "Sales")} value={String(tenant._count.sales)} />
            <Row label={t("settings.currency", "Currency")} value={tenant.settings?.currency ?? "—"} />
            <Row label={t("customers.col.phone", "Phone")} value={tenant.settings?.phone ?? "—"} />
            <Row label={t("customers.field.address", "Address")} value={tenant.settings?.address ?? "—"} />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-400 text-xs">{label}</p>
      <p className="text-gray-900">{value}</p>
    </div>
  );
}
