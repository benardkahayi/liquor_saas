import { Prisma } from "@prisma/client";
import { db } from "@/config/db";
import { NotFoundError } from "@/common/errors/AppError";

interface CreateCustomerInput {
  fullName: string;
  email?: string;
  phone?: string;
  address?: string;
}

export async function createCustomer(tenantId: string, input: CreateCustomerInput) {
  return db.customer.create({ data: { ...input, tenantId } });
}

interface ListCustomersInput {
  page: number;
  pageSize: number;
  search?: string;
}

export async function listCustomers(tenantId: string, input: ListCustomersInput) {
  const where: Prisma.CustomerWhereInput = {
    tenantId,
    ...(input.search && {
      fullName: { contains: input.search, mode: "insensitive" },
    }),
  };

  const [items, total] = await Promise.all([
    db.customer.findMany({
      where,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      orderBy: { fullName: "asc" },
    }),
    db.customer.count({ where }),
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

export async function getCustomerById(tenantId: string, customerId: string) {
  const customer = await db.customer.findFirst({
    where: { id: customerId, tenantId },
  });

  if (!customer) {
    throw new NotFoundError("Customer not found");
  }

  const recentSales = await db.sale.findMany({
    where: { tenantId, customerId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, total: true, createdAt: true },
  });

  const totalsAggregate = await db.sale.aggregate({
    where: { tenantId, customerId },
    _sum: { total: true },
    _count: true,
  });

  return {
    ...customer,
    recentSales,
    totalPurchases: totalsAggregate._count,
    lifetimeValue: totalsAggregate._sum.total ?? new Prisma.Decimal(0),
  };
}

export async function updateCustomer(
  tenantId: string,
  customerId: string,
  input: Partial<CreateCustomerInput>
) {
  const existing = await db.customer.findFirst({ where: { id: customerId, tenantId } });
  if (!existing) {
    throw new NotFoundError("Customer not found");
  }

  return db.customer.update({ where: { id: customerId }, data: input });
}

export async function deleteCustomer(tenantId: string, customerId: string) {
  const existing = await db.customer.findFirst({ where: { id: customerId, tenantId } });
  if (!existing) {
    throw new NotFoundError("Customer not found");
  }

  const saleCount = await db.sale.count({ where: { tenantId, customerId } });

  if (saleCount > 0) {
    return db.customer.update({
      where: { id: customerId },
      data: { fullName: "[Deleted Customer]", email: null, phone: null, address: null },
    });
  }

  return db.customer.delete({ where: { id: customerId } });
}