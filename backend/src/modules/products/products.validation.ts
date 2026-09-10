import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  categoryId: z.string().uuid().optional(),
  brand: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  purchasePrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  stockQuantity: z.number().int().nonnegative().default(0),
  minStockLevel: z.number().int().nonnegative().default(5),
  imageUrl: z.string().url().optional(),
  supplierId: z.string().uuid().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  lowStockOnly: z.coerce.boolean().optional(),
});