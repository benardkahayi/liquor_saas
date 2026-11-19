import { useTenant } from "../context/TenantContext";
import { isRestaurant } from "../lib/businessTypes";
import { DashboardPage } from "./DashboardPage";
import { RestaurantDashboardPage } from "./RestaurantDashboardpage";
import { PlanUsageBanner } from "../components/PlanUsageBanner";

// "/dashboard" shows the dashboard that fits the business: restaurants see
// today's food sales, payments and debts; shops see products, stock and sales.
export function HomeDashboard() {
  const { tenant, isLoading } = useTenant();

  if (!tenant && isLoading) {
    return <p className="text-sm text-gray-400">Loading...</p>;
  }

  return (
    <>
      <PlanUsageBanner />
      {isRestaurant(tenant?.industry) ? <RestaurantDashboardPage /> : <DashboardPage />}
    </>
  );
}
