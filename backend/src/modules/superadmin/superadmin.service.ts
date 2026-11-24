import { Prisma } from "@prisma/client";
import { db } from "@/config/db";
import { BadRequestError, ConflictError, NotFoundError } from "@/common/errors/AppError";
import { PLANS, PlanName, priceFor, startOfMonthEAT } from "@/modules/subscriptions/plans";
import { setPlan } from "@/modules/subscriptions/subscriptions.service";

interface ListTenantsInput {
  page: number;
  pageSize: number;
  status?: "ACTIVE" | "SUSPENDED" | "TRIAL" | "CANCELLED";
  search?: string;
}

export async function listTenants(input: ListTenantsInput) {
  const where: Prisma.TenantWhereInput = {
    ...(input.status && { status: input.status }),
    ...(input.search && { name: { contains: input.search, mode: "insensitive" } }),
  };

  const [items, total] = await Promise.all([
    db.tenant.findMany({
      where,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        subscription: true,
        settings: { select: { phone: true } },
        _count: { select: { users: true, products: true } },
        users: {
          where: { role: { name: "Owner" } },
          select: { fullName: true, email: true },
          take: 1,
        },
      },
    }),
    db.tenant.count({ where }),
  ]);

  const activity = await getActivityFor(items.map((t) => ({ id: t.id, createdAt: t.createdAt, products: t._count.products })));

  return {
    items: items.map((t) => ({ ...t, activity: activity.get(t.id) })),
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    },
  };
}

export async function getTenantById(tenantId: string) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: {
      settings: true,
      subscription: true,
      _count: {
        select: { users: true, products: true, sales: true, orders: true, customers: true, subscriptionPayments: true },
      },
    },
  });

  if (!tenant) {
    throw new NotFoundError("Tenant not found");
  }

  return tenant;
}

export async function updateTenantStatus(
  tenantId: string,
  status: "ACTIVE" | "SUSPENDED" | "TRIAL" | "CANCELLED"
) {
  const existing = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!existing) {
    throw new NotFoundError("Tenant not found");
  }

  return db.tenant.update({ where: { id: tenantId }, data: { status } });
}

export async function getPlatformStats() {
  const [totalTenants, activeTenants, totalUsers, revenueAgg] = await Promise.all([
    db.tenant.count(),
    db.tenant.count({ where: { status: "ACTIVE" } }),
    db.user.count({ where: { isSuperAdmin: false } }),
    db.sale.aggregate({ where: { status: "COMPLETED" }, _sum: { total: true } }),
  ]);

  const monthStart = startOfMonthEAT();
  const [{ summary }, collected] = await Promise.all([
    listSubscriptions({}),
    db.subscriptionPayment.aggregate({ where: { paidAt: { gte: monthStart } }, _sum: { amount: true } }),
  ]);
  return {
    totalTenants,
    activeTenants,
    totalUsers,
    platformRevenue: revenueAgg._sum.total ?? 0,
    // Expected each month from plans that are paid up right now.
    monthlyIncomeTzs: summary.monthlyIncomeTzs,
    // Actually received this month (recorded payments).
    collectedThisMonthTzs: collected._sum.amount ?? 0,
    payingBusinesses: summary.payingNow,
  };
}

const DAY = 24 * 60 * 60 * 1000;

type DueState = "free" | "paid" | "expiring" | "expired";
function dueState(plan: string, end: Date | null, now = Date.now()): DueState {
  if (plan === "FREE") return "free";
  if (!end || end.getTime() < now) return "expired";
  if (end.getTime() - now <= 7 * DAY) return "expiring";
  return "paid";
}

// Every business with its plan, price, payment date and how much it uses.
export async function listSubscriptions(input: {
  plan?: PlanName;
  due?: "expiring" | "expired";
  search?: string;
}) {
  const tenants = await db.tenant.findMany({
    where: input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { users: { some: { email: { contains: input.search, mode: "insensitive" } } } },
          ],
        }
      : {},
    orderBy: { createdAt: "desc" },
    include: {
      subscription: true,
      _count: { select: { users: true } },
      users: {
        where: { role: { name: "Owner" } },
        select: { fullName: true, email: true },
        take: 1,
      },
    },
  });

  const monthStart = startOfMonthEAT();
  const ids = tenants.map((t) => t.id);
  const [sales, orders] = await Promise.all([
    db.sale.groupBy({ by: ["tenantId"], where: { tenantId: { in: ids }, status: "COMPLETED", createdAt: { gte: monthStart } }, _count: { _all: true } }),
    db.order.groupBy({ by: ["tenantId"], where: { tenantId: { in: ids }, status: "COMPLETED", createdAt: { gte: monthStart } }, _count: { _all: true } }),
  ]);
  const salesThisMonth = new Map<string, number>();
  for (const r of [...sales, ...orders]) {
    salesThisMonth.set(r.tenantId, (salesThisMonth.get(r.tenantId) ?? 0) + r._count._all);
  }

  const now = Date.now();
  const rows = tenants.map((t) => {
    const plan = (t.subscription?.plan ?? "FREE") as PlanName;
    const end = t.subscription?.currentPeriodEnd ?? null;
    return {
      tenantId: t.id,
      name: t.name,
      slug: t.slug,
      industry: t.industry,
      tenantStatus: t.status,
      owner: t.users[0] ?? null,
      users: t._count.users,
      plan,
      planLabel: PLANS[plan].label,
      priceTzs: priceFor(plan, t.industry),
      // What each paid plan costs this business (null = price not set yet).
      planPrices: { STARTER: priceFor("STARTER", t.industry), PRO: priceFor("PRO", t.industry) },
      paidUntil: end,
      due: dueState(plan, end, now),
      salesThisMonth: salesThisMonth.get(t.id) ?? 0,
      createdAt: t.createdAt,
    };
  });

  const summary = {
    businesses: rows.length,
    byPlan: { FREE: 0, STARTER: 0, PRO: 0 } as Record<PlanName, number>,
    payingNow: 0,
    // Money expected each month from plans that are paid up right now.
    monthlyIncomeTzs: 0,
    expiringSoon: 0,
    expired: 0,
  };
  for (const r of rows) {
    summary.byPlan[r.plan]++;
    if (r.due === "paid" || r.due === "expiring") {
      summary.payingNow++;
      summary.monthlyIncomeTzs += r.priceTzs ?? 0;
    }
    if (r.due === "expiring") summary.expiringSoon++;
    if (r.due === "expired") summary.expired++;
  }

  const items = rows.filter(
    (r) => (!input.plan || r.plan === input.plan) && (!input.due || r.due === input.due)
  );
  return { summary, items };
}

// Everyone with a login, across all businesses.
export async function listUsers(input: {
  page: number;
  pageSize: number;
  search?: string;
  status?: "active" | "inactive";
}) {
  const where: Prisma.UserWhereInput = {
    ...(input.status && { isActive: input.status === "active" }),
    ...(input.search && {
      OR: [
        { fullName: { contains: input.search, mode: "insensitive" } },
        { email: { contains: input.search, mode: "insensitive" } },
        { tenant: { name: { contains: input.search, mode: "insensitive" } } },
      ],
    }),
  };
  const [items, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        isSuperAdmin: true,
        createdAt: true,
        role: { select: { name: true } },
        tenant: { select: { id: true, name: true, industry: true, status: true } },
      },
    }),
    db.user.count({ where }),
  ]);
  return {
    items,
    pagination: { page: input.page, pageSize: input.pageSize, total, totalPages: Math.ceil(total / input.pageSize) },
  };
}

// Block or allow one person's login. Platform admins can't be blocked here,
// so you can't lock yourself out.
export async function setUserActive(userId: string, isActive: boolean) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { isSuperAdmin: true } });
  if (!user) throw new NotFoundError("User not found");
  if (user.isSuperAdmin) throw new BadRequestError("Platform admin accounts can't be turned off here.");
  return db.user.update({
    where: { id: userId },
    data: { isActive },
    select: { id: true, isActive: true },
  });
}

// ---------------------------------------------------------------------------
// Subscription payments
// ---------------------------------------------------------------------------

export type SubscriptionPaymentMethod =
  | "MPESA"
  | "MIXX_BY_YAS"
  | "AIRTEL_MONEY"
  | "HALOPESA"
  | "BANK"
  | "CASH"
  | "OTHER";

export interface PaymentInput {
  amount: number;
  method: SubscriptionPaymentMethod;
  reference?: string;
  note?: string;
  paidAt?: Date;
}

// Change a business's plan. A paid plan needs the payment that pays for it;
// both are saved together, so a plan is never switched on without a record
// of the money (and a payment is never saved for a plan change that failed).
export async function changeTenantPlan(
  tenantId: string,
  plan: PlanName,
  payment: PaymentInput | undefined,
  recordedById: string | null
) {
  if (plan !== "FREE" && !payment) {
    throw new BadRequestError("Enter the payment (amount, how it was paid, transaction ID) to switch on a paid plan.");
  }

  const reference = payment?.reference?.trim() || null;
  if (payment && reference) {
    const dup = await db.subscriptionPayment.findFirst({
      where: { method: payment.method, reference: { equals: reference, mode: "insensitive" } },
      select: { tenant: { select: { name: true } }, paidAt: true },
    });
    if (dup) {
      throw new ConflictError(
        `This transaction ID was already recorded for ${dup.tenant.name} on ${dup.paidAt.toISOString().slice(0, 10)}.`
      );
    }
  }

  return db.$transaction(async (tx) => {
    const subscription = await setPlan(tenantId, plan, tx);
    const saved =
      payment && plan !== "FREE"
        ? await tx.subscriptionPayment.create({
            data: {
              tenantId,
              plan,
              amount: payment.amount,
              method: payment.method,
              reference,
              note: payment.note?.trim() || null,
              paidAt: payment.paidAt ?? new Date(),
              periodEnd: subscription.currentPeriodEnd,
              recordedById,
            },
          })
        : null;
    return { subscription, payment: saved };
  });
}

export async function listPayments(input: { page: number; pageSize: number; tenantId?: string; search?: string }) {
  const where: Prisma.SubscriptionPaymentWhereInput = {
    ...(input.tenantId && { tenantId: input.tenantId }),
    ...(input.search && {
      OR: [
        { reference: { contains: input.search, mode: "insensitive" } },
        { tenant: { name: { contains: input.search, mode: "insensitive" } } },
      ],
    }),
  };
  const [items, total, sum] = await Promise.all([
    db.subscriptionPayment.findMany({
      where,
      orderBy: { paidAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: { tenant: { select: { id: true, name: true } } },
    }),
    db.subscriptionPayment.count({ where }),
    db.subscriptionPayment.aggregate({ where, _sum: { amount: true } }),
  ]);
  return {
    items,
    totalAmount: sum._sum.amount ?? 0,
    pagination: { page: input.page, pageSize: input.pageSize, total, totalPages: Math.ceil(total / input.pageSize) },
  };
}

export type OverviewRange = "7D" | "30D" | "3M" | "1Y";

const EAT_OFFSET = 3 * 60 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Start of the EAT day containing `t`, as a UTC timestamp.
function startOfDayEAT(t: number) {
  const d = new Date(t + EAT_OFFSET);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - EAT_OFFSET;
}

// Buckets for the money-received chart: days for short ranges, weeks for
// three months, calendar months for a year. All in East Africa Time.
function buildBuckets(range: OverviewRange, now = Date.now()) {
  const buckets: { label: string; start: number; end: number }[] = [];
  const label = (t: number) => {
    const d = new Date(t + EAT_OFFSET);
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  };
  if (range === "1Y") {
    const d = new Date(now + EAT_OFFSET);
    for (let i = 11; i >= 0; i--) {
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth() - i;
      const start = Date.UTC(y, m, 1) - EAT_OFFSET;
      const end = Date.UTC(y, m + 1, 1) - EAT_OFFSET;
      buckets.push({ label: MONTHS[new Date(start + EAT_OFFSET).getUTCMonth()], start, end });
    }
    return buckets;
  }
  const [count, days] = range === "7D" ? [7, 1] : range === "30D" ? [10, 3] : [13, 7];
  const tomorrow = startOfDayEAT(now) + DAY;
  for (let i = count - 1; i >= 0; i--) {
    const end = tomorrow - i * days * DAY;
    const start = end - days * DAY;
    buckets.push({ label: label(start), start, end });
  }
  return buckets;
}

// Money actually received over a period, for the dashboard chart, plus the
// latest payments.
export async function getPaymentsOverview(range: OverviewRange) {
  const buckets = buildBuckets(range);
  const from = new Date(buckets[0].start);
  const prevFrom = new Date(from.getTime() - (Date.now() - from.getTime()));
  const [inRange, previous, recent] = await Promise.all([
    db.subscriptionPayment.findMany({ where: { paidAt: { gte: from } }, select: { amount: true, paidAt: true } }),
    db.subscriptionPayment.aggregate({ where: { paidAt: { gte: prevFrom, lt: from } }, _sum: { amount: true } }),
    db.subscriptionPayment.findMany({
      orderBy: { paidAt: "desc" },
      take: 8,
      include: { tenant: { select: { id: true, name: true } } },
    }),
  ]);
  const points = buckets.map((b) => ({ label: b.label, value: 0 }));
  let total = 0;
  for (const p of inRange) {
    const t = p.paidAt.getTime();
    const i = buckets.findIndex((b) => t >= b.start && t < b.end);
    if (i >= 0) {
      points[i].value += p.amount;
      total += p.amount;
    }
  }
  return { range, total, previousTotal: previous._sum.amount ?? 0, points, recent };
}

// What happened on the platform lately, built from real records: new
// businesses, payments received, and staff added to a business.
export async function getActivity(limit = 10) {
  const [tenants, payments, users] = await Promise.all([
    db.tenant.findMany({ orderBy: { createdAt: "desc" }, take: limit, select: { id: true, name: true, createdAt: true } }),
    db.subscriptionPayment.findMany({
      orderBy: { paidAt: "desc" },
      take: limit,
      select: { id: true, amount: true, plan: true, paidAt: true, tenant: { select: { id: true, name: true } } },
    }),
    db.user.findMany({
      where: { isSuperAdmin: false, tenantId: { not: null }, NOT: { role: { name: "Owner" } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, fullName: true, createdAt: true, tenant: { select: { id: true, name: true } } },
    }),
  ]);
  const events = [
    ...tenants.map((t) => ({ id: `t-${t.id}`, type: "registered" as const, tenantId: t.id, businessName: t.name, at: t.createdAt })),
    ...payments.map((p) => ({
      id: `p-${p.id}`,
      type: "paymentReceived" as const,
      tenantId: p.tenant.id,
      businessName: p.tenant.name,
      at: p.paidAt,
      amount: p.amount,
      plan: p.plan,
    })),
    ...users
      .filter((u) => u.tenant)
      .map((u) => ({
        id: `u-${u.id}`,
        type: "userAdded" as const,
        tenantId: u.tenant!.id,
        businessName: u.tenant!.name,
        at: u.createdAt,
        person: u.fullName,
      })),
  ];
  events.sort((a, b) => b.at.getTime() - a.at.getTime());
  return events.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Delete a business
// ---------------------------------------------------------------------------

// Permanently removes a business and everything in it: staff accounts,
// products, sales, orders, customers, payments. It can't be undone, so the
// admin must type the business's exact name.
//
// Sales, orders, purchases and stock history are removed first: they point at
// products, menu items and cashiers in a way the database won't let go of
// while they still exist. Everything else is removed with the business.
export async function deleteTenant(tenantId: string, confirmName: string, deletedBy: string | null) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, slug: true, _count: { select: { users: true, sales: true, orders: true } } },
  });
  if (!tenant) throw new NotFoundError("Business not found");
  if (confirmName.trim() !== tenant.name.trim()) {
    throw new BadRequestError("The name you typed doesn't match the business name. Nothing was deleted.");
  }

  await db.$transaction(
    async (tx) => {
      await tx.orderPayment.deleteMany({ where: { tenantId } });
      await tx.orderItem.deleteMany({ where: { order: { tenantId } } });
      await tx.order.deleteMany({ where: { tenantId } });
      await tx.sale.deleteMany({ where: { tenantId } }); // its items and payments go with it
      await tx.purchase.deleteMany({ where: { tenantId } }); // its items go with it
      await tx.inventoryTransaction.deleteMany({ where: { tenantId } });
      await tx.tenant.delete({ where: { id: tenantId } }); // everything else goes with it
    },
    { timeout: 60_000, maxWait: 10_000 }
  );

  console.info(
    `[superadmin] business "${tenant.name}" (${tenant.slug}) deleted by ${deletedBy ?? "unknown"}: ` +
      `${tenant._count.users} users, ${tenant._count.sales} sales, ${tenant._count.orders} orders`
  );
  return { id: tenant.id, name: tenant.name };
}

// ---------------------------------------------------------------------------
// How actively each business uses the app
// ---------------------------------------------------------------------------

export type ActivityLevel = "active" | "trying" | "quiet" | "new" | "signed_up_only";

export interface TenantActivity {
  level: ActivityLevel;
  salesLast7Days: number; // sales + restaurant orders
  daysWithSalesLast7: number;
  lastSaleAt: Date | null;
  lastActiveAt: Date | null; // latest login / use by anyone in the business
  products: number;
}

// Sales and restaurant orders count the same. Days are East Africa Time days.
//   active          sold on 3 or more of the last 7 days
//   trying          some sales this week, or products added but no sales yet
//   quiet           used to sell, nothing in the last 7 days
//   new             registered under 2 days ago, nothing yet
//   signed_up_only  2+ days old, no products and no sales
export async function getActivityFor(
  tenants: { id: string; createdAt: Date; products: number }[]
): Promise<Map<string, TenantActivity>> {
  const result = new Map<string, TenantActivity>();
  if (tenants.length === 0) return result;
  const ids = tenants.map((t) => t.id);

  const [sales, seen] = await Promise.all([
    db.$queryRaw<{ tenantId: string; n7: number; days7: number; last: Date | null }[]>`
      SELECT "tenantId",
             COUNT(*) FILTER (WHERE "createdAt" >= now() - interval '7 days')::int AS n7,
             COUNT(DISTINCT (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Dar_es_Salaam')::date)
               FILTER (WHERE "createdAt" >= now() - interval '7 days')::int AS days7,
             MAX("createdAt") AS last
      FROM (
        SELECT "tenantId", "createdAt" FROM sales WHERE "tenantId" = ANY(${ids}::text[])
        UNION ALL
        SELECT "tenantId", "createdAt" FROM orders WHERE "tenantId" = ANY(${ids}::text[])
      ) s
      GROUP BY "tenantId"`,
    db.user.groupBy({ by: ["tenantId"], where: { tenantId: { in: ids } }, _max: { lastActiveAt: true } }),
  ]);
  const salesBy = new Map(sales.map((r) => [r.tenantId, r]));
  const seenBy = new Map(seen.map((r) => [r.tenantId, r._max.lastActiveAt]));

  const now = Date.now();
  for (const t of tenants) {
    const s = salesBy.get(t.id);
    const n7 = s?.n7 ?? 0;
    const days7 = s?.days7 ?? 0;
    const last = s?.last ?? null;
    const level: ActivityLevel =
      days7 >= 3
        ? "active"
        : n7 > 0
          ? "trying"
          : last
            ? "quiet"
            : t.products > 0
              ? "trying"
              : now - t.createdAt.getTime() < 2 * DAY
                ? "new"
                : "signed_up_only";
    result.set(t.id, {
      level,
      salesLast7Days: n7,
      daysWithSalesLast7: days7,
      lastSaleAt: last,
      lastActiveAt: seenBy.get(t.id) ?? null,
      products: t.products,
    });
  }
  return result;
}
