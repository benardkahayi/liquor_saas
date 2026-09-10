import { Prisma } from "@prisma/client";
import { db } from "@/config/db";
import { NotFoundError } from "@/common/errors/AppError";

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
      include: { subscription: true, _count: { select: { users: true } } },
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

  return {
    totalTenants,
    activeTenants,
    totalUsers,
    platformRevenue: revenueAgg._sum.total ?? 0,
  };
}