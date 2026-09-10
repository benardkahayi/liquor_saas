import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { Pagination } from "../../components/Pagination";
import { ErrorBanner, extractErrorMessage } from "../../components/ErrorBanner";

type TenantStatus = "ACTIVE" | "SUSPENDED" | "TRIAL" | "CANCELLED";

interface Tenant {
  id: string;
  name: string;
  status: TenantStatus;
  createdAt: string;
  _count: { users: number };
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function SuperAdminTenantsPage() {
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
      .catch((err) => setError(extractErrorMessage(err, "Failed to load tenants")))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [page, search, status]);

  async function toggleStatus(tenant: Tenant) {
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
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tenants</h1>

      <ErrorBanner message={error} />

      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Search tenants..."
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
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="TRIAL">Trial</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Users</th>
              <th className="px-4 py-2 font-medium">Created</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading && tenants.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No tenants found.
                </td>
              </tr>
            )}
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2 text-gray-900">
                  <Link to={`/super-admin/tenants/${tenant.id}`} className="hover:underline text-blue-600">
                    {tenant.name}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={tenant.status} />
                </td>
                <td className="px-4 py-2 text-gray-600">{tenant._count.users}</td>
                <td className="px-4 py-2 text-gray-600">{new Date(tenant.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => toggleStatus(tenant)} className="text-blue-600 hover:underline">
                    {tenant.status === "SUSPENDED" ? "Activate" : "Suspend"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
    </div>
  );
}

function StatusBadge({ status }: { status: TenantStatus }) {
  const colors: Record<TenantStatus, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    TRIAL: "bg-blue-100 text-blue-700",
    SUSPENDED: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-500",
  };
  return <span className={`badge ${colors[status]}`}>{status}</span>;
}
