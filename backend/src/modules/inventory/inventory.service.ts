import { Prisma } from "@prisma/client";
import { db } from "@/config/db";
import { NotFoundError, BadRequestError } from "@/common/errors/AppError";
import { importRowSchema } from "./inventory.validation";
import { productSlotsLeft } from "@/modules/subscriptions/subscriptions.service";

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

// ---------------------------------------------------------------------------
// Receiving stock (deliveries)
// ---------------------------------------------------------------------------

interface StockInInput {
  productId: string;
  quantity: number;
  unitCost?: number;
  sellingPrice?: number;
  note?: string;
}

export async function stockIn(tenantId: string, input: StockInInput) {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const product = await tx.product.findFirst({ where: { id: input.productId, tenantId } });
    if (!product) throw new NotFoundError("Product not found");

    const updated = await tx.product.update({
      where: { id: product.id },
      data: {
        stockQuantity: { increment: input.quantity },
        ...(input.unitCost !== undefined && { purchasePrice: input.unitCost }),
        ...(input.sellingPrice !== undefined && { sellingPrice: input.sellingPrice }),
      },
      select: { stockQuantity: true },
    });

    const transaction = await tx.inventoryTransaction.create({
      data: {
        tenantId,
        productId: product.id,
        type: "PURCHASE_IN",
        quantity: input.quantity,
        reason: input.note?.trim() || "Stock received",
      },
    });

    return { transaction, newStockQuantity: updated.stockQuantity };
  });
}

export async function listStockIns(tenantId: string, input: ListHistoryInput) {
  const where = { tenantId, type: "PURCHASE_IN" as const };
  const [items, total] = await Promise.all([
    db.inventoryTransaction.findMany({
      where,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      orderBy: { createdAt: "desc" },
      include: { product: { select: { id: true, name: true, sku: true, purchasePrice: true } } },
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

// ---------------------------------------------------------------------------
// CSV import. The browser parses the file and sends rows; we match each row
// to a product (SKU first, then exact name, case-insensitive), optionally
// create missing products, and add the quantity as received stock.
// All-or-nothing: if any row has a problem nothing is saved, so uploading the
// corrected file again never double-counts stock.
// ---------------------------------------------------------------------------

type RowAction = "add" | "create" | "skip" | "error";

interface ImportRowResult {
  line: number;
  name: string;
  sku: string | null;
  quantity: number;
  action: RowAction;
  productId?: string;
  currentStock?: number;
  newStock?: number;
  message?: string;
}

interface ImportInput {
  rows: unknown[];
  createMissing: boolean;
  dryRun: boolean;
}

interface PlannedRow {
  result: ImportRowResult;
  purchasePrice?: number;
  sellingPrice?: number;
  minStockLevel?: number;
  newKey?: string; // groups several rows for the same new product
}

export async function importStock(tenantId: string, input: ImportInput) {
  const products = await db.product.findMany({
    where: { tenantId },
    select: { id: true, name: true, sku: true, stockQuantity: true, status: true },
  });

  const bySku = new Map<string, typeof products[number]>();
  const byName = new Map<string, typeof products[number][]>();
  for (const p of products) {
    if (p.sku) bySku.set(p.sku.trim().toLowerCase(), p);
    const key = p.name.trim().toLowerCase();
    byName.set(key, [...(byName.get(key) ?? []), p]);
  }

  const running = new Map<string, number>(); // productId -> stock after earlier rows
  const newProducts = new Map<string, { stock: number }>(); // key -> stock
  const planned: PlannedRow[] = [];

  input.rows.forEach((raw, index) => {
    const line = index + 2; // line 1 is the header
    const parsed = importRowSchema.safeParse(raw);
    const rawObj = (raw ?? {}) as Record<string, unknown>;
    const fallbackName = typeof rawObj.name === "string" ? rawObj.name.trim() : "";

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      planned.push({
        result: {
          line,
          name: fallbackName,
          sku: null,
          quantity: 0,
          action: "error",
          message: `${issue.path.join(".") || "row"}: ${issue.message}`,
        },
      });
      return;
    }

    const row = parsed.data;
    const base = { line, name: row.name, sku: row.sku ?? null, quantity: row.quantity };

    if (!row.name && !row.sku) {
      planned.push({ result: { ...base, action: "error", message: "Name or SKU is required" } });
      return;
    }

    let match = row.sku ? bySku.get(row.sku.toLowerCase()) : undefined;
    if (!match && row.name) {
      const named = byName.get(row.name.toLowerCase()) ?? [];
      const active = named.filter((p) => p.status === "ACTIVE");
      const pool = active.length ? active : named;
      if (pool.length > 1) {
        planned.push({
          result: { ...base, action: "error", message: "More than one product has this name. Add its SKU." },
        });
        return;
      }
      match = pool[0];
    }

    const prices = {
      purchasePrice: row.purchasePrice,
      sellingPrice: row.sellingPrice,
      minStockLevel: row.minStockLevel,
    };

    if (match) {
      const current = running.get(match.id) ?? match.stockQuantity;
      const next = current + row.quantity;
      running.set(match.id, next);
      const changesPrice = row.purchasePrice !== undefined || row.sellingPrice !== undefined;
      planned.push({
        ...prices,
        result: {
          ...base,
          name: match.name,
          sku: match.sku,
          action: row.quantity === 0 && !changesPrice ? "skip" : "add",
          productId: match.id,
          currentStock: current,
          newStock: next,
          ...(row.quantity === 0 && !changesPrice && { message: "Quantity is 0, nothing to add" }),
        },
      });
      return;
    }

    if (!input.createMissing) {
      planned.push({ result: { ...base, action: "error", message: "No product with this name or SKU" } });
      return;
    }
    if (!row.name) {
      planned.push({ result: { ...base, action: "error", message: "New products need a name" } });
      return;
    }

    const newKey = row.sku ? `sku:${row.sku.toLowerCase()}` : `name:${row.name.toLowerCase()}`;
    const existingNew = newProducts.get(newKey);
    if (!existingNew && row.sellingPrice === undefined) {
      planned.push({ result: { ...base, action: "error", message: "New product: selling price is required" } });
      return;
    }
    const current = existingNew?.stock ?? 0;
    const next = current + row.quantity;
    newProducts.set(newKey, { stock: next });
    planned.push({
      ...prices,
      newKey,
      result: { ...base, action: existingNew ? "add" : "create", currentStock: current, newStock: next },
    });
  });

  // Plan limit for new products.
  const creating = planned.filter((p) => p.result.action === "create");
  const slots = creating.length ? await productSlotsLeft(tenantId) : null;
  if (slots !== null && creating.length > slots) {
    creating.slice(slots).forEach((p) => {
      p.result.action = "error";
      p.result.message = "Your plan's product limit is reached. Upgrade to add more products.";
    });
  }

  const results = planned.map((p) => p.result);
  const errors = results.filter((r) => r.action === "error").length;
  const summary = {
    rows: results.length,
    add: results.filter((r) => r.action === "add").length,
    create: results.filter((r) => r.action === "create").length,
    skip: results.filter((r) => r.action === "skip").length,
    errors,
    units: results.filter((r) => r.action === "add" || r.action === "create").reduce((s, r) => s + r.quantity, 0),
  };

  if (input.dryRun || errors > 0) {
    return { applied: false, summary, rows: results };
  }

  await db.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const createdIds = new Map<string, string>();
      for (const p of planned) {
        const r = p.result;
        if (r.action === "skip") continue;

        let productId = r.productId;
        if (!productId && p.newKey) productId = createdIds.get(p.newKey);

        if (!productId) {
          const created = await tx.product.create({
            data: {
              tenantId,
              name: r.name,
              sku: r.sku ?? undefined,
              purchasePrice: p.purchasePrice ?? 0,
              sellingPrice: p.sellingPrice ?? 0,
              minStockLevel: p.minStockLevel ?? 5,
              stockQuantity: r.quantity,
            },
            select: { id: true },
          });
          createdIds.set(p.newKey!, created.id);
          r.productId = created.id;
        } else {
          await tx.product.updateMany({
            where: { id: productId, tenantId },
            data: {
              stockQuantity: { increment: r.quantity },
              ...(p.purchasePrice !== undefined && { purchasePrice: p.purchasePrice }),
              ...(p.sellingPrice !== undefined && { sellingPrice: p.sellingPrice }),
              ...(p.minStockLevel !== undefined && { minStockLevel: p.minStockLevel }),
            },
          });
          r.productId = productId;
        }

        if (r.quantity > 0) {
          await tx.inventoryTransaction.create({
            data: {
              tenantId,
              productId: r.productId!,
              type: "PURCHASE_IN",
              quantity: r.quantity,
              reason: r.action === "create" ? "CSV import (new product)" : "CSV import",
            },
          });
        }
      }
    },
    { timeout: 60_000, maxWait: 10_000 }
  );

  return { applied: true, summary, rows: results };
}
