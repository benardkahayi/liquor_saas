import { db } from "@/config/db";
import { startOfMonthEAT } from "@/modules/subscriptions/plans";
import { getActivityFor, listSubscriptions } from "./superadmin.service";

// Everything the Super Admin dashboard shows, in one request. All months and
// days are East Africa Time. Built only from real records: businesses,
// sales/orders, and recorded subscription payments.

const EAT = 3 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "YYYY-MM" of the EAT month containing `t`, and helpers to move by months.
const monthKey = (t: number) => new Date(t + EAT).toISOString().slice(0, 7);
function monthStart(key: string) {
  const [y, m] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, 1) - EAT;
}
function addMonths(key: string, n: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}
const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
};
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);
const growth = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 1000) / 10 : null);

export async function getOverview() {
  const now = Date.now();
  const thisMonth = monthKey(now);
  const lastMonth = addMonths(thisMonth, -1);
  const thisMonthStart = startOfMonthEAT();
  const lastMonthStart = new Date(monthStart(lastMonth));
  const todayStart = new Date(Date.UTC(new Date(now + EAT).getUTCFullYear(), new Date(now + EAT).getUTCMonth(), new Date(now + EAT).getUTCDate()) - EAT);

  const [tenants, subs, payments, sellingMonths, firstSales, users, salesToday] = await Promise.all([
    db.tenant.findMany({
      select: {
        id: true,
        name: true,
        industry: true,
        status: true,
        createdAt: true,
        settings: { select: { phone: true } },
        _count: { select: { products: true, menuItems: true } },
      },
    }),
    listSubscriptions({}),
    db.subscriptionPayment.findMany({ select: { tenantId: true, amount: true, paidAt: true } }),
    // Which months each business sold something in (sales or restaurant orders).
    db.$queryRaw<{ tenantId: string; month: string }[]>`
      SELECT "tenantId", to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Dar_es_Salaam', 'YYYY-MM') AS month
      FROM (
        SELECT "tenantId", "createdAt" FROM sales WHERE status = 'COMPLETED'
        UNION ALL
        SELECT "tenantId", "createdAt" FROM orders WHERE status = 'COMPLETED'
      ) s
      GROUP BY 1, 2`,
    db.$queryRaw<{ tenantId: string; first: Date }[]>`
      SELECT "tenantId", MIN("createdAt") AS first
      FROM (
        SELECT "tenantId", "createdAt" FROM sales
        UNION ALL
        SELECT "tenantId", "createdAt" FROM orders
      ) s
      GROUP BY 1`,
    db.user.count({ where: { isSuperAdmin: false } }),
    db.$queryRaw<{ n: number }[]>`
      SELECT (
        (SELECT COUNT(*) FROM sales WHERE status = 'COMPLETED' AND "createdAt" >= ${todayStart}) +
        (SELECT COUNT(*) FROM orders WHERE status = 'COMPLETED' AND "createdAt" >= ${todayStart})
      )::int AS n`,
  ]);

  const activity = await getActivityFor(
    tenants.map((t) => ({ id: t.id, createdAt: t.createdAt, products: t._count.products + t._count.menuItems }))
  );
  const subBy = new Map(subs.items.map((s) => [s.tenantId, s]));
  const firstSaleBy = new Map(firstSales.map((r) => [r.tenantId, new Date(r.first).getTime()]));

  // --- Income -------------------------------------------------------------
  const mrr = subs.summary.monthlyIncomeTzs;
  const sumPaid = (from: number, to: number) =>
    payments.filter((p) => p.paidAt.getTime() >= from && p.paidAt.getTime() < to).reduce((s, p) => s + p.amount, 0);
  const collectedThisMonth = sumPaid(thisMonthStart.getTime(), now + DAY);
  const collectedLastMonth = sumPaid(lastMonthStart.getTime(), thisMonthStart.getTime());
  const collectedToday = sumPaid(todayStart.getTime(), now + DAY);

  // --- Renewals / churn ---------------------------------------------------
  const paid = subs.items.filter((s) => s.plan !== "FREE");
  const lapsed30 = paid.filter(
    (s) => s.due === "expired" && s.paidUntil && now - new Date(s.paidUntil).getTime() <= 30 * DAY
  );
  const expiring = paid.filter((s) => s.due === "expiring");
  const lostIncome = lapsed30.reduce((s, r) => s + (r.priceTzs ?? 0), 0);
  const atRisk = expiring.reduce((s, r) => s + (r.priceTzs ?? 0), 0);
  const churnRate = pct(lapsed30.length, subs.summary.payingNow + lapsed30.length);

  // --- Businesses -----------------------------------------------------------
  const newThisMonth = tenants.filter((t) => t.createdAt >= thisMonthStart).length;
  const newLastMonth = tenants.filter((t) => t.createdAt >= lastMonthStart && t.createdAt < thisMonthStart).length;
  const newToday = tenants.filter((t) => t.createdAt >= todayStart).length;

  const levels = { active: 0, trying: 0, quiet: 0, new: 0, signed_up_only: 0 };
  for (const a of activity.values()) levels[a.level]++;

  // --- Activation funnel ----------------------------------------------------
  const everPaid = new Set(payments.map((p) => p.tenantId));
  const funnel = [
    { key: "registered", count: tenants.length },
    { key: "setUp", count: tenants.filter((t) => t._count.products + t._count.menuItems > 0).length },
    { key: "firstSale", count: firstSaleBy.size },
    { key: "activeWeek", count: levels.active },
    { key: "paying", count: subs.summary.payingNow },
  ].map((s) => ({ ...s, percent: pct(s.count, tenants.length) }));

  const daysToFirstSale = tenants
    .filter((t) => firstSaleBy.has(t.id))
    .map((t) => Math.max(0, (firstSaleBy.get(t.id)! - t.createdAt.getTime()) / DAY))
    .sort((a, b) => a - b);
  const medianDaysToFirstSale = daysToFirstSale.length
    ? Math.round(daysToFirstSale[Math.floor(daysToFirstSale.length / 2)] * 10) / 10
    : null;

  // --- 12-month trajectory --------------------------------------------------
  const monthsBack = Array.from({ length: 12 }, (_, i) => addMonths(thisMonth, i - 11));
  const sellersByMonth = new Map<string, Set<string>>();
  for (const r of sellingMonths) {
    if (!sellersByMonth.has(r.month)) sellersByMonth.set(r.month, new Set());
    sellersByMonth.get(r.month)!.add(r.tenantId);
  }
  const trajectory = monthsBack.map((key) => {
    const end = monthStart(addMonths(key, 1));
    return {
      month: key,
      label: monthLabel(key),
      businesses: tenants.filter((t) => t.createdAt.getTime() < end).length,
      selling: sellersByMonth.get(key)?.size ?? 0,
      collected: sumPaid(monthStart(key), end),
    };
  });

  // --- Income by plan -------------------------------------------------------
  const byPlan = (["PRO", "STARTER", "FREE"] as const).map((plan) => {
    const rows = subs.items.filter((s) => s.plan === plan);
    const payingRows = rows.filter((s) => s.due === "paid" || s.due === "expiring");
    return {
      plan,
      businesses: rows.length,
      paying: plan === "FREE" ? 0 : payingRows.length,
      monthlyIncome: payingRows.reduce((s, r) => s + (r.priceTzs ?? 0), 0),
    };
  });

  // --- Business types -------------------------------------------------------
  const typeMap = new Map<string, { industry: string; businesses: number; active: number; paying: number; newThisMonth: number }>();
  for (const t of tenants) {
    const row = typeMap.get(t.industry) ?? { industry: t.industry, businesses: 0, active: 0, paying: 0, newThisMonth: 0 };
    row.businesses++;
    const lvl = activity.get(t.id)?.level;
    if (lvl === "active" || lvl === "trying") row.active++;
    const due = subBy.get(t.id)?.due;
    if (due === "paid" || due === "expiring") row.paying++;
    if (t.createdAt >= thisMonthStart) row.newThisMonth++;
    typeMap.set(t.industry, row);
  }
  const byType = [...typeMap.values()].sort((a, b) => b.businesses - a.businesses);

  // --- Cohorts: of the businesses that joined in a month, how many were
  // still selling 1, 2, 3 and 6 months later. --------------------------------
  const soldIn = new Map<string, Set<string>>(); // tenantId -> months with sales
  for (const r of sellingMonths) {
    if (!soldIn.has(r.tenantId)) soldIn.set(r.tenantId, new Set());
    soldIn.get(r.tenantId)!.add(r.month);
  }
  const OFFSETS = [0, 1, 2, 3, 6];
  const cohorts = Array.from({ length: 6 }, (_, i) => addMonths(thisMonth, i - 5))
    .reverse()
    .map((key) => {
      const members = tenants.filter((t) => monthKey(t.createdAt.getTime()) === key);
      const cells = OFFSETS.map((k) => {
        const target = addMonths(key, k);
        if (target > thisMonth || members.length === 0) return null; // not reached yet
        const n = members.filter((t) => soldIn.get(t.id)?.has(target)).length;
        return { selling: n, percent: pct(n, members.length), partial: target === thisMonth };
      });
      return { month: key, label: monthLabel(key), businesses: members.length, cells };
    });

  // --- Income movement this month ------------------------------------------
  const firstPaymentAt = new Map<string, number>();
  for (const p of payments) {
    const t = p.paidAt.getTime();
    if (!firstPaymentAt.has(p.tenantId) || t < firstPaymentAt.get(p.tenantId)!) firstPaymentAt.set(p.tenantId, t);
  }
  let newPaying = 0;
  let renewals = 0;
  const newPayers = new Set<string>();
  for (const p of payments) {
    if (p.paidAt < thisMonthStart) continue;
    if (firstPaymentAt.get(p.tenantId)! >= thisMonthStart.getTime()) {
      newPaying += p.amount;
      newPayers.add(p.tenantId);
    } else renewals += p.amount;
  }

  const tenantBy = new Map(tenants.map((t) => [t.id, t]));
  const attention = [...expiring, ...lapsed30]
    .sort((a, b) => new Date(a.paidUntil!).getTime() - new Date(b.paidUntil!).getTime())
    .slice(0, 8)
    .map((s) => ({
      tenantId: s.tenantId,
      name: s.name,
      plan: s.plan,
      priceTzs: s.priceTzs,
      paidUntil: s.paidUntil,
      due: s.due,
      phone: tenantBy.get(s.tenantId)?.settings?.phone ?? null,
    }));

  return {
    generatedAt: new Date(now),
    ticker: {
      newToday,
      salesToday: salesToday[0]?.n ?? 0,
      collectedToday,
      users,
      expiringSoon: expiring.length,
    },
    income: {
      mrr,
      arr: mrr * 12,
      collectedThisMonth,
      collectedLastMonth,
      collectedGrowth: growth(collectedThisMonth, collectedLastMonth),
      payingNow: subs.summary.payingNow,
    },
    churn: {
      rate: churnRate,
      lapsed: lapsed30.length,
      lostIncome,
      expiring: expiring.length,
      atRisk,
    },
    businesses: {
      total: tenants.length,
      newThisMonth,
      newLastMonth,
      newGrowth: growth(newThisMonth, newLastMonth),
      byPlan: subs.summary.byPlan,
    },
    engagement: {
      activeThisWeek: levels.active,
      activeRate: pct(levels.active, tenants.length),
      levels,
      everPaid: everPaid.size,
      freeToPaidRate: pct(everPaid.size, tenants.length),
      medianDaysToFirstSale,
    },
    trajectory,
    byPlan,
    funnel,
    byType,
    cohorts,
    movement: {
      newPaying,
      newPayers: newPayers.size,
      renewals,
      lostIncome,
      lapsed: lapsed30.length,
      atRisk,
      expiring: expiring.length,
    },
    attention,
  };
}
