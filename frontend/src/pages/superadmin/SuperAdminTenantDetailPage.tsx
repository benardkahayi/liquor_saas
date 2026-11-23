import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { api } from "../../api/client";
import { useLanguage } from "../../context/LanguageContext";
import { ErrorBanner, extractErrorMessage } from "../../components/ErrorBanner";
import { Modal } from "../../components/Modal";

type TenantStatus = "ACTIVE" | "SUSPENDED" | "TRIAL" | "CANCELLED";

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  createdAt: string;
  settings: { phone: string | null; address: string | null; currency: string | null } | null;
  subscription: { plan?: string; status?: string } | null;
  _count: {
    users: number;
    products: number;
    sales: number;
    orders?: number;
    customers?: number;
    subscriptionPayments?: number;
  };
}

export function SuperAdminTenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

      {tenant && (
        <section className="mt-6 rounded-xl border border-red-200 bg-red-50/40 p-5">
          <h2 className="font-semibold text-red-700">{t("superadmin.delete.zone", "Delete this business")}</h2>
          <p className="mt-1 text-sm text-gray-600">
            {t(
              "superadmin.delete.zoneHelp",
              "Removes the business and all its data for good. To stop it for a while instead, use Suspend — that can be undone."
            )}
          </p>
          <button
            type="button"
            onClick={() => setDeleting(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            <Trash2 size={16} />
            {t("superadmin.delete.button", "Delete business")}
          </button>
        </section>
      )}

      {tenant && deleting && <DeleteTenantModal tenant={tenant} onClose={() => setDeleting(false)} />}
    </div>
  );
}

// Asks for the exact business name before deleting, and says plainly what
// will be lost.
function DeleteTenantModal({ tenant, onClose }: { tenant: TenantDetail; onClose: () => void }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = typed.trim() === tenant.name.trim();
  const c = tenant._count;

  const losses = [
    [c.users, t("superadmin.delete.users", "staff accounts (they can't log in anymore)")],
    [c.products, t("superadmin.delete.products", "products / menu items")],
    [c.sales, t("superadmin.delete.sales", "sales")],
    [c.orders ?? 0, t("superadmin.delete.orders", "restaurant orders")],
    [c.customers ?? 0, t("superadmin.delete.customers", "customers")],
    [c.subscriptionPayments ?? 0, t("superadmin.delete.payments", "subscription payments (removed from your income records)")],
  ].filter(([n]) => Number(n) > 0) as [number, string][];

  async function confirmDelete() {
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/superadmin/tenants/${tenant.id}`, { data: { confirmName: typed } });
      navigate("/super-admin/tenants", { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err, t("superadmin.delete.error", "Could not delete the business")));
      setBusy(false);
    }
  }

  return (
    <Modal title={t("superadmin.delete.title", "Delete business for good?")} onClose={busy ? () => {} : onClose}>
      <div className="space-y-4 text-sm">
        <p className="text-gray-700">
          {t("superadmin.delete.warn", "This deletes {name} and everything in it. It can't be undone.").replace(
            "{name}",
            tenant.name
          )}
        </p>
        {losses.length > 0 && (
          <ul className="list-disc space-y-1 rounded-lg bg-red-50 py-3 pl-8 pr-3 text-red-800">
            {losses.map(([n, label]) => (
              <li key={label}>
                <span className="font-semibold">{n}</span> {label}
              </li>
            ))}
          </ul>
        )}

        <ErrorBanner message={error} />

        <div>
          <label htmlFor="confirm-name" className="mb-1 block font-medium text-gray-700">
            {t("superadmin.delete.typeName", "Type the business name to confirm:")}{" "}
            <span className="select-all font-semibold text-gray-900">{tenant.name}</span>
          </label>
          <input
            id="confirm-name"
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="input"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 text-gray-600 hover:text-gray-900">
            {t("common.cancel", "Cancel")}
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={!matches || busy}
            className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? t("superadmin.delete.busy", "Deleting…") : t("superadmin.delete.confirm", "Delete forever")}
          </button>
        </div>
      </div>
    </Modal>
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
