import { Prisma } from "@prisma/client";
import { db } from "@/config/db";
import { NotFoundError, BadRequestError, ConflictError } from "@/common/errors/AppError";

interface CreateSupplierInput {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export async function createSupplier(tenantId: string, input: CreateSupplierInput) {
  return db.supplier.create({ data: { ...input, tenantId } });
}

interface ListSuppliersInput {
  page: number;
  pageSize: number;
  search?: string;
}

export async function listSuppliers(tenantId: string, input: ListSuppliersInput) {
  const where: Prisma.SupplierWhereInput = {
    tenantId,
    ...(input.search && { name: { contains: input.search, mode: "insensitive" } }),
  };

  const [items, total] = await Promise.all([
    db.supplier.findMany({
      where,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      orderBy: { name: "asc" },
    }),
    db.supplier.count({ where }),
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

export async function getSupplierById(tenantId: string, supplierId: string) {
  const supplier = await db.supplier.findFirst({
    where: { id: supplierId, tenantId },
    include: {
      products: { select: { id: true, name: true, stockQuantity: true } },
      purchases: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, totalAmount: true, status: true, createdAt: true },
      },
    },
  });

  if (!supplier) {
    throw new NotFoundError("Supplier not found");
  }

  return supplier;
}

export async function updateSupplier(
  tenantId: string,
  supplierId: string,
  input: Partial<CreateSupplierInput>
) {
  const existing = await db.supplier.findFirst({ where: { id: supplierId, tenantId } });
  if (!existing) {
    throw new NotFoundError("Supplier not found");
  }

  return db.supplier.update({ where: { id: supplierId }, data: input });
}

export async function deleteSupplier(tenantId: string, supplierId: string) {
  const existing = await db.supplier.findFirst({ where: { id: supplierId, tenantId } });
  if (!existing) {
    throw new NotFoundError("Supplier not found");
  }

  const linkedProductCount = await db.product.count({ where: { tenantId, supplierId } });

  if (linkedProductCount > 0) {
    throw new ConflictError(
      `Cannot delete: ${linkedProductCount} product(s) still reference this supplier`
    );
  }

  return db.supplier.delete({ where: { id: supplierId } });
}

export async function recordPayment(tenantId: string, supplierId: string, amount: number) {
  const supplier = await db.supplier.findFirst({ where: { id: supplierId, tenantId } });
  if (!supplier) {
    throw new NotFoundError("Supplier not found");
  }

  const paymentAmount = new Prisma.Decimal(amount);

  if (paymentAmount.greaterThan(supplier.amountOwed)) {
    throw new BadRequestError(
      `Payment ($${paymentAmount.toFixed(2)}) exceeds amount owed ($${supplier.amountOwed.toFixed(2)})`
    );
  }

  return db.supplier.update({
    where: { id: supplierId },
    data: { amountOwed: supplier.amountOwed.sub(paymentAmount) },
  });
}