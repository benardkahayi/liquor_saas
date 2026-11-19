/**
 * TEMPORARY MOCK DATA — platform-level features with no backend support yet.
 *
 * The backend has no billing/payment integration (see the comment in
 * backend/src/modules/subscriptions/subscriptions.service.ts) and no
 * platform activity/audit log. Everything in this file stands in for
 * those until real endpoints exist. Nothing here is used for tenant-scoped
 * pages — only the Super Admin platform overview.
 *
 * To replace with real data: swap each function's body for an API call
 * and delete the corresponding mock generator. The call sites don't need
 * to change shape.
 */

// Placeholder monthly prices per plan — the backend subscription model has
// no price field (see PLAN_LIMITS in subscriptions.validation.ts, which is
// limits-only). Used only to estimate MRR until real billing exists.
export const MOCK_PLAN_PRICES: Record<string, number> = {
  FREE: 0,
  STARTER: 290000,
  PRO: 990000,
};

export interface RevenuePoint {
  label: string;
  value: number;
}

// Deterministic (not random-per-render) so the chart doesn't jitter on
// every refresh. Seeded off the current estimated MRR so at least the
// endpoint of the trend ties to something derived from real tenant data.
export function getMockRevenueTrend(currentMRR: number, buckets: number): RevenuePoint[] {
  const points: RevenuePoint[] = [];
  for (let i = buckets - 1; i >= 0; i--) {
    const wobble = Math.sin(i * 1.3) * 0.08 + Math.cos(i * 0.7) * 0.05;
    const growthBack = 1 - i * (0.035 + Math.abs(Math.sin(i)) * 0.01);
    const value = Math.max(0, currentMRR * growthBack * (1 + wobble));
    points.push({ label: `P${buckets - i}`, value: Math.round(value) });
  }
  points[points.length - 1] = { ...points[points.length - 1], value: Math.round(currentMRR) };
  return points;
}

export interface MockPayment {
  id: string;
  businessName: string;
  plan: string;
  amount: number;
  status: "PAID" | "PENDING" | "FAILED" | "REFUNDED";
  date: string;
}

export function getMockRecentPayments(tenantNames: string[]): MockPayment[] {
  const statuses: MockPayment["status"][] = ["PAID", "PAID", "PAID", "PENDING", "FAILED", "REFUNDED"];
  const plans = ["STARTER", "PRO", "STARTER", "PRO", "FREE"];
  return tenantNames.slice(0, 6).map((name, i) => ({
    id: `mock-payment-${i}`,
    businessName: name,
    plan: plans[i % plans.length],
    amount: MOCK_PLAN_PRICES[plans[i % plans.length]] ?? 0,
    status: statuses[i % statuses.length],
    date: new Date(Date.now() - i * 1000 * 60 * 60 * 24 * 3).toISOString(),
  }));
}

// Template keys resolved to translated strings at render time — see
// ACTIVITY_TEMPLATE_KEYS usage in SuperAdminDashboardPage.tsx.
export type ActivityTemplateKey =
  | "registered"
  | "upgraded"
  | "paymentReceived"
  | "userAdded"
  | "suspended";

export interface MockActivity {
  id: string;
  templateKey: ActivityTemplateKey;
  businessName: string;
  timestamp: string;
}

export function getMockActivity(tenantNames: string[]): MockActivity[] {
  const templateKeys: ActivityTemplateKey[] = [
    "registered",
    "upgraded",
    "paymentReceived",
    "userAdded",
    "suspended",
  ];
  return tenantNames.slice(0, 5).map((name, i) => ({
    id: `mock-activity-${i}`,
    templateKey: templateKeys[i % templateKeys.length],
    businessName: name,
    timestamp: new Date(Date.now() - i * 1000 * 60 * 60 * 5).toISOString(),
  }));
}
