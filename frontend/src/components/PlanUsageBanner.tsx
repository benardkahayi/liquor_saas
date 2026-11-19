import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { fetchPlanUsage, type PlanUsage, type UsageRow } from "../lib/planUsage";
import { useLanguage } from "../context/LanguageContext";

// A one-line notice on the dashboard when the business is close to, or at,
// a plan limit. Shows nothing otherwise — and nothing to staff who can't
// manage the plan (the request is refused for them).
export function PlanUsageBanner() {
  const { t } = useLanguage();
  const [usage, setUsage] = useState<PlanUsage | null>(null);

  useEffect(() => {
    fetchPlanUsage().then(setUsage).catch(() => setUsage(null));
  }, []);

  if (!usage) return null;
  const rows: UsageRow[] = [usage.usage.items, usage.usage.staff, usage.usage.sales];
  const reached = rows.filter((r) => r.level === "reached");
  const near = rows.filter((r) => r.level === "near");
  if (reached.length === 0 && near.length === 0) return null;

  const isReached = reached.length > 0;
  const row = (isReached ? reached : near)[0];
  const salesOnly = row === usage.usage.sales;

  const message = isReached
    ? salesOnly
      ? t("plan.banner.salesReached", `You've passed this month's ${row.limit} sales on the ${usage.planLabel} plan. Sales still work — upgrade to stay within your plan.`)
      : t("plan.banner.reached", `You've reached your ${usage.planLabel} plan's limit for ${row.label.toLowerCase()} (${row.used}/${row.limit}).`)
    : t("plan.banner.near", `You're close to your ${usage.planLabel} plan's limit for ${row.label.toLowerCase()} (${row.used}/${row.limit}).`);

  return (
    <div
      className={`mb-6 flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
        isReached ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      <AlertTriangle size={18} className="shrink-0" />
      <p className="flex-1">{message}</p>
      <Link
        to="/plan"
        className={`rounded-lg px-3 py-1.5 font-semibold text-white ${isReached ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}`}
      >
        {t("plan.banner.cta", "See plans")}
      </Link>
    </div>
  );
}
