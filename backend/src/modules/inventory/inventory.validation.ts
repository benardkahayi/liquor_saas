import { z } from "zod";

export const createAdjustmentSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .refine((val) => val !== 0, "Quantity cannot be zero"),
  reason: z.string().min(3, "Please provide a reason for this adjustment"),
});

export const listHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

// Receiving new stock (a delivery). unitCost, when given, becomes the
// product's new purchase price so profit reports use the latest cost.
export const stockInSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  quantity: z.number().int("Quantity must be a whole number").positive("Quantity must be more than zero"),
  unitCost: z.number().nonnegative().optional(),
  sellingPrice: z.number().nonnegative().optional(),
  note: z.string().trim().max(200).optional(),
});

const optionalMoney = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number({ message: "Must be a number" }).nonnegative("Cannot be negative").optional()
);

export const importRowSchema = z.object({
  name: z.string().trim().max(150).default(""),
  sku: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(60).optional()),
  quantity: z.coerce.number({ message: "Quantity must be a number" }).int("Quantity must be a whole number").nonnegative("Quantity cannot be negative"),
  purchasePrice: optionalMoney,
  sellingPrice: optionalMoney,
  minStockLevel: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().nonnegative().optional()
  ),
});

export const importStockSchema = z.object({
  rows: z.array(z.unknown()).min(1, "The file has no rows").max(1000, "Up to 1000 rows per file"),
  createMissing: z.boolean().default(true),
  dryRun: z.boolean().default(true),
});

export const listStockInsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
