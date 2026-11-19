import { Prisma } from "@prisma/client";
import { db } from "@/config/db";
import { NotFoundError, BadRequestError } from "@/common/errors/AppError";

interface CreateAdjustmentInput {
  productId: string;
  quantity: number;
  reason: string;
}

export async function createAdjustment(tenantId: string, input: CreateAdjustmentInput) {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const product = await tx.product.findFirst({
      where: { id: input.productId, tenantId },
    });

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    // Relative, atomic update. The old code wrote an absolute number
    // (current + adjustment) computed from a stale read, so a sale that
    // happened in between was silently wiped out. For removals, the WHERE
    // guard makes "would go negative" a check at write time, not read time.
    const updated = await tx.product.updateMany({
      where: {
        id: product.id,
        tenantId,
        ...(input.quantity < 0 && { stockQuantity: { gte: -input.quantity } }),
      },
      data: { stockQuantity: { increment: input.quantity } },
    });

    if (updated.count === 0) {
      const current = await tx.product.findUniqueOrThrow({ where: { id: product.id } });
      throw new BadRequestError(
        `This adjustment would result in negative stock (current: ${current.stockQuantity}, adjustment: ${input.quantity})`
      );
    }

    const { stockQuantity: newQuantity } = await tx.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { stockQuantity: true },
    });

    const transaction = await tx.inventoryTransaction.create({
      data: {
        tenantId,
        productId: product.id,
        type: "ADJUSTMENT",
        quantity: input.quantity,
        reason: input.reason,
      },
    });

    return { transaction, newStockQuantity: newQuantity };
  });
}

interface ListHistoryInput {
  page: number;
  pageSize: number;
}

export async function listHistoryForProduct(
  tenantId: string,
  productId: string,
  input: ListHistoryInput
) {
  const product = await db.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  const where = { tenantId, productId };

  const [items, total] = await Promise.all([
    db.inventoryTransaction.findMany({
      where,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      orderBy: { createdAt: "desc" },
    }),
    db.inventoryTransaction.count({ where }),
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