import { z } from "zod";

const saleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive("Quantity must be at least 1"),
});

const paymentSchema = z.object({
  method: z.enum(["CASH", "CARD", "MOBILE_MONEY", "OTHER"]),
  amount: z.number().positive(),
});

export const createSaleSchema = z.object({
  customerId: z.string().uuid().optional(),
  items: z.array(saleItemSchema).min(1, "A sale must include at least one item"),
  discount: z.number().nonnegative().default(0),
  payments: z.array(paymentSchema).min(1, "At least one payment is required"),
});

export const listSalesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});