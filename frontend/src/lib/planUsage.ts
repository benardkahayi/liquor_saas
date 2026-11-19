import { api } from "../api/client";

export type UsageLevel = "ok" | "near" | "reached";

export interface UsageRow {
  label: string;
  used: number;
  limit: number | null;
  level: UsageLevel;
}

export interface PlanOption {
  name: "FREE" | "STARTER" | "PRO";
  label: string;
  priceTzs: number | null;
  items: number | null;
  staff: number | null;
  monthlySales: number | null;
}

export interface PlanUsage {
  plan: PlanOption["name"];
  planLabel: string;
  status: string;
  currentPeriodEnd: string | null;
  industry: string | null;
  usage: { items: UsageRow; staff: UsageRow; sales: UsageRow };
  plans: PlanOption[];
}

export async function fetchPlanUsage(): Promise<PlanUsage> {
  const res = await api.get<{ data: PlanUsage }>("/subscriptions/usage");
  return res.data.data;
}
