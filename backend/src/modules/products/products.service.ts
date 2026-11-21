import { db } from "@/config/db";
import { NotFoundError, ConflictError, ForbiddenError } from "@/common/errors/AppError";
import { Prisma } from "@prisma/client";
import { checkProductLimit } from "@/modules/subscriptions/subscriptions.service";

interface CreateProductInput {
  name: string;
  categoryId?: string;
  brand?: string;
  sku?: string;
  barcode?: string;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockLevel: number;
  imageUrl?: string;
  supplierId?: string;
}

// A product may only point at this business's own category and supplier.
async function checkLinks(tenantId: string, input: { categoryId?: string | null; supplierId?: string | null }) {
  const [category, supplier] = await Promise.all([
    input.categoryId ? db.category.findFirst({ where: { id: input.categoryId, tenantId }, select: { id: true } }) : true,
    input.supplierId ? db.supplier.findFirst({ where: { id: input.supplierId, tenantId }, select: { id: true } }) : true,
  ]);
  if (!category) throw new NotFoundError("Category not found");
  if (!supplier) throw new NotFoundError("Supplier not found");
}

export async function createProduct(tenantId: string, input: CreateProductInput) {
  const limitCheck = await checkProductLimit(tenantId);
  if (limitCheck.limitReached) {
    throw new ForbiddenError(
      `You've reached your ${limitCheck.plan} plan's limit of ${limitCheck.limit} products. Upgrade your plan to add more.`
    );
  }

  await checkLinks(tenantId, input);

  if (input.sku) {
    const existing = await db.product.findFirst({
      where: { tenantId, sku: input.sku },
    });
    if (existing) {
      throw new ConflictError(`A product with SKU "${input.sku}" already exists`);
    }
  }

  return db.product.create({
    data: { ...input, tenantId },
  });
}

interface ListProductsInput {
  page: number;
  pageSize: number;
  search?: string;
  categoryId?: string;
  lowStockOnly?: boolean;
}

export async function listProducts(tenantId: string, input: ListProductsInput) {
  const where: Prisma.ProductWhereInput = {
    tenantId,
    ...(input.search && {
      name: { contains: input.search, mode: "insensitive" },
    }),
    ...(input.categoryId && { categoryId: input.categoryId }),
  };

  if (input.lowStockOnly) {
    const lowStockIds = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM products
      WHERE "tenantId" = ${tenantId} AND "stockQuantity" <= "minStockLevel"
    `;
    where.id = { in: lowStockIds.map((p) => p.id) };
  }

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      orderBy: { createdAt: "desc" },
      include: { category: true, supplier: true },
    }),
    db.product.count({ where }),
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

export async function getProductById(tenantId: string, productId: string) {
  const product = await db.product.findFirst({
    where: { id: productId, tenantId },
    include: { category: true, supplier: true },
  });

  if (!product) {
    throw new NotFoundError("Product not found");
  }

  return product;
}

export async function updateProduct(
  tenantId: string,
  productId: string,
  input: Partial<CreateProductInput>
) {
  await getProductById(tenantId, productId);
  await checkLinks(tenantId, input);

  return db.product.update({
    where: { id: productId },
    data: input,
  });
}

export async function deleteProduct(tenantId: string, productId: string) {
  await getProductById(tenantId, productId);

  return db.product.update({
    where: { id: productId },
    data: { status: "DISCONTINUED" },
  });
}
