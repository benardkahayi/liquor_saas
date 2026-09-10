import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../api/client";
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
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api
      .get(`/superadmin/tenants/${id}`)
      .then((res) => setTenant(res.data.data))
      .catch((err) => setError(extractErrorMessage(err, "Failed to load tenant")));
  }

  useEffect(load, [id]);

  async function toggleStatus() {
    if (!tenant) return;
    const nextStatus: TenantStatus = tenant.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    if (!confirm(`${nextStatus === "SUSPENDED" ? "Suspend" : "Activate"} "${tenant.name}"?`)) return;

    try {
      await api.put(`/superadmin/tenants/${tenant.id}/status`, { status: nextStatus });
      load();
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to update tenant status"));
    }
  }

  return (
    <div className="max-w-2xl">
      <Link to="/super-admin/tenants" className="text-sm text-blue-600 hover:underline">
        &larr; Back to Tenants
      </Link>

      <ErrorBanner message={error} />

      {tenant && (
        <div className="card p-6 mt-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
              <p className="text-sm text-gray-500">{tenant.slug}</p>
            </div>
            <button
              onClick={toggleStatus}
              className="btn-primary px-4 py-2 text-sm"
            >
              {tenant.status === "SUSPENDED" ? "Activate" : "Suspend"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <Row label="Status" value={tenant.status} />
            <Row label="Created" value={new Date(tenant.createdAt).toLocaleDateString()} />
            <Row label="Users" value={String(tenant._count.users)} />
            <Row label="Products" value={String(tenant._count.products)} />
            <Row label="Sales" value={String(tenant._count.sales)} />
            <Row label="Currency" value={tenant.settings?.currency ?? "—"} />
            <Row label="Phone" value={tenant.settings?.phone ?? "—"} />
            <Row label="Address" value={tenant.settings?.address ?? "—"} />
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
