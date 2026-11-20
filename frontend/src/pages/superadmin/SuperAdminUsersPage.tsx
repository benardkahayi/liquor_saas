import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "../../api/client";
import { useLanguage } from "../../context/LanguageContext";
import { Pagination } from "../../components/Pagination";
import { ErrorBanner, extractErrorMessage } from "../../components/ErrorBanner";

interface UserRow {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  role: { name: string } | null;
  tenant: { id: string; name: string; industry: string | null; status: string } | null;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function SuperAdminUsersPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "active" | "inactive">("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function load() {
    setIsLoading(true);
    api
      .get("/superadmin/users", { params: { page, pageSize: 25, search: search.trim() || undefined, status: status || undefined } })
      .then((res) => {
        setUsers(res.data.items);
        setPagination(res.data.pagination);
        setError(null);
      })
      .catch((err) => setError(extractErrorMessage(err, t("superadmin.users.error", "Failed to load users"))))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [page, search, status]);

  async function toggle(u: UserRow) {
    const next = !u.isActive;
    const msg = next
      ? `Let ${u.fullName} (${u.email}) log in again?`
      : `Block ${u.fullName} (${u.email})? They won't be able to log in.`;
    if (!confirm(msg)) return;
    try {
      await api.put(`/superadmin/users/${u.id}/status`, { isActive: next });
      load();
    } catch (err) {
      setError(extractErrorMessage(err, t("superadmin.users.error.change", "Could not change this user")));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("superadmin.users.title", "Users")}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t("superadmin.users.subtitle", "Everyone who can log in, across all businesses.")}
          {pagination && <span className="ml-1 text-gray-400">({pagination.total})</span>}
        </p>
      </div>

      <ErrorBanner message={error} />

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative block min-w-0 flex-1 basis-64">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder={t("superadmin.users.search", "Name, email or business")}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as "" | "active" | "inactive");
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">{t("superadmin.users.everyone", "Everyone")}</option>
          <option value="active">{t("superadmin.users.active", "Can log in")}</option>
          <option value="inactive">{t("superadmin.users.blocked", "Blocked")}</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">{t("superadmin.users.name", "Name")}</th>
              <th className="px-4 py-3">{t("superadmin.users.business", "Business")}</th>
              <th className="px-4 py-3">{t("superadmin.users.role", "Role")}</th>
              <th className="px-4 py-3">{t("superadmin.users.joined", "Joined")}</th>
              <th className="px-4 py-3">{t("superadmin.users.status", "Status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && users.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">{t("common.loading", "Loading...")}</td></tr>
            )}
            {!isLoading && users.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">{t("superadmin.users.none", "No users match.")}</td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900">{u.fullName}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  {u.tenant ? (
                    <Link to={`/super-admin/tenants/${u.tenant.id}`} className="text-gray-900 hover:text-blue-600">
                      {u.tenant.name}
                    </Link>
                  ) : (
                    <span className="text-gray-400">{t("superadmin.users.platform", "Platform")}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {u.isSuperAdmin ? t("superadmin.users.admin", "Platform admin") : u.role?.name ?? "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                  {new Date(u.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-3">
                  {u.isSuperAdmin ? (
                    <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                      {t("superadmin.users.active", "Can log in")}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggle(u)}
                      title={u.isActive ? t("superadmin.users.clickBlock", "Click to block") : t("superadmin.users.clickAllow", "Click to allow")}
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        u.isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-red-100 text-red-700 hover:bg-red-200"
                      }`}
                    >
                      {u.isActive ? t("superadmin.users.active", "Can log in") : t("superadmin.users.blocked", "Blocked")}
                    </button>
                  )}
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

export default SuperAdminUsersPage;
