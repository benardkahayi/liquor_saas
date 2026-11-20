import { Prisma } from "@prisma/client";
import { db } from "@/config/db";
import { BadRequestError, NotFoundError } from "@/common/errors/AppError";
import { PLANS, PlanName, priceFor, startOfMonthEAT } from "@/modules/subscriptions/plans";

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
        _count: { select: { users: true } },
        users: {
          where: { role: { name: "Owner" } },
          select: { fullName: true, email: true },
          take: 1,
        },
      },
    }),
    db.tenant.count({ where }),
  ]);

  return {
    items,
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
      _count: { select: { users: true, products: true, sales: true } },
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

  const { summary } = await listSubscriptions({});
  return {
    totalTenants,
    activeTenants,
    totalUsers,
    platformRevenue: revenueAgg._sum.total ?? 0,
    monthlyIncomeTzs: summary.monthlyIncomeTzs,
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
