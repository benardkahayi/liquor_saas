import { Prisma } from "@prisma/client";
import { db } from "@/config/db";
import { NotFoundError, BadRequestError } from "@/common/errors/AppError";

interface SaleItemInput {
  productId: string;
  quantity: number;
}

interface PaymentInput {
  method: "CASH" | "CARD" | "MOBILE_MONEY" | "OTHER";
  amount: number;
}

interface CreateSaleInput {
  customerId?: string;
  items: SaleItemInput[];
  discount: number;
  payments: PaymentInput[];
}

export async function createSale(
  tenantId: string,
  cashierId: string,
  input: CreateSaleInput
) {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const productIds = input.items.map((i) => i.productId);
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, tenantId },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = new Prisma.Decimal(0);
    const lineItems: {
      productId: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
    }[] = [];

    for (const item of input.items) {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new NotFoundError(`Product ${item.productId} not found`);
      }

      if (product.stockQuantity < item.quantity) {
        throw new BadRequestError(
          `Insufficient stock for "${product.name}" (have ${product.stockQuantity}, need ${item.quantity})`
        );
      }

      const lineTotal = product.sellingPrice.mul(item.quantity);
      subtotal = subtotal.add(lineTotal);

      lineItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.sellingPrice,
        lineTotal,
      });
    }

    const discount = new Prisma.Decimal(input.discount);
    const total = subtotal.sub(discount);

    if (total.isNegative()) {
      throw new BadRequestError("Discount cannot exceed the subtotal");
    }

    const paidAmount = input.payments.reduce(
      (sum, p) => sum.add(new Prisma.Decimal(p.amount)),
      new Prisma.Decimal(0)
    );

    if (!paidAmount.equals(total)) {
      throw new BadRequestError(
        `Payments (${paidAmount.toFixed(2)}) do not match the sale total (${total.toFixed(2)})`
      );
    }

    const sale = await tx.sale.create({
      data: {
        tenantId,
        customerId: input.customerId,
        cashierId,
        subtotal,
        discount,
        tax: 0,
        total,
        items: { create: lineItems },
        payments: { create: input.payments },
      },
      include: { items: true, payments: true },
    });

    for (const item of lineItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { decrement: item.quantity } },
      });

      await tx.inventoryTransaction.create({
        data: {
          tenantId,
          productId: item.productId,
          type: "SALE_OUT",
          quantity: -item.quantity,
          reason: `Sale #${sale.id}`,
        },
      });
    }

    return sale;
  });
}

interface ListSalesInput {
  page: number;
  pageSize: number;
  startDate?: Date;
  endDate?: Date;
}

export async function listSales(tenantId: string, input: ListSalesInput) {
  const where: Prisma.SaleWhereInput = {
    tenantId,
    ...(input.startDate || input.endDate
      ? {
          createdAt: {
            ...(input.startDate && { gte: input.startDate }),
            ...(input.endDate && { lte: input.endDate }),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.sale.findMany({
      where,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { product: { select: { name: true } } } },
        payments: true,
        customer: { select: { fullName: true } },
      },
    }),
    db.sale.count({ where }),
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

export async function getSaleById(tenantId: string, saleId: string) {
  const sale = await db.sale.findFirst({
    where: { id: saleId, tenantId },
    include: {
      items: { include: { product: true } },
      payments: true,
      customer: true,
      cashier: { select: { fullName: true } },
    },
  });

  if (!sale) {
    throw new NotFoundError("Sale not found");
  }

  return sale;
}