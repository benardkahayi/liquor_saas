import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { money } from "../../lib/money";
import { ErrorBanner, extractErrorMessage } from "../../components/ErrorBanner";

interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  platformRevenue: number | string;
}

export function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/superadmin/stats")
      .then((res) => setStats(res.data.data))
      .catch((err) => setError(extractErrorMessage(err, "Failed to load platform stats")));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform Stats</h1>

      <ErrorBanner message={error} />

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Tenants" value={stats.totalTenants} />
          <StatCard label="Active Tenants" value={stats.activeTenants} />
          <StatCard label="Total Users" value={stats.totalUsers} />
          <StatCard label="Platform Revenue" value={money(stats.platformRevenue)} />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
